using Common.Time;
using Messages;
using Microsoft.EntityFrameworkCore;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.UserEvents;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.TimeLog
{
    public class TimeLogService : ITimeLogService
    {
        public const double MaxAllowedRequestedDays = 10 * 365;
        public static readonly TimeSpan MaxAllowedTimeBlockLength = TimeSpan.FromDays(1);

        public TimeLogService(ITimeService timeService, IUserEventsService userEventsService)
        {
            _timeService = timeService;
            _userEventsService = userEventsService;
        }

        /// <summary>
        /// Returns the time log entries sorted from latest to earliest
        /// </summary>
        public async Task<IList<TimeLogEntryMsg>> Get(MainDbContext db, Guid pollId, DateTime fromTime, DateTime toTime)
        {
            // Basic validation
            if (fromTime > toTime)
            {
                throw new BadRequestException("'fromTime' cannot come after 'toTime'.");
            }
            else if ((toTime - fromTime).TotalDays > MaxAllowedRequestedDays)
            {
                throw new BadRequestException($"Cannot request more than {MaxAllowedRequestedDays} days of logs at a time.");
            }

            // Load the data.
            // Remove any time zone information to prevent confusion.
            var cleanedFromTime = DateTime.SpecifyKind(fromTime, DateTimeKind.Unspecified);
            var cleanedToTime = DateTime.SpecifyKind(toTime, DateTimeKind.Unspecified);

            var timeLogEntries = await db.TimeLogEntries.Where(r => r.PollId == pollId
                                                                  && r.ToTime > cleanedFromTime
                                                                  && r.FromTime < cleanedToTime).ToListAsync();

            if (!timeLogEntries.Any())
            {
                return new TimeLogEntryMsg[] { };
            }

            var sortedEntries = timeLogEntries
                .OrderByDescending(r => r.ToTime)
                .ThenByDescending(e => e.CreatedTimeUtc)
                .ToList();

            // Process the overlaps, undos, and deletions.
            // We will:
            //    - first, process overlaps and undos in the entries, 
            //      treating deletions as if they are any other entries.
            //    - then, remove the deletions.
            //
            // Remember: a few lines before this, we sorted the entries
            // from he latest ToTime to the earliest, and then from the
            // most recently inserted to the oldest.
            var results = new List<TimeLogEntryMsgWithDeletionMarker>(sortedEntries.Count);
            var undoTargets = new HashSet<Guid>();

            var lastFromTime = DateTime.MaxValue;
            var lastToTime = DateTime.MaxValue;

            foreach (var entry in sortedEntries)
            {
                if (entry.IsUndo())
                {
                    undoTargets.Add(entry.UndoTarget.Value);
                    continue;
                }

                if (undoTargets.Contains(entry.Id))
                {
                    continue;
                }

                // Work through the cases from the easiest to the hardest.
                if (entry.ToTime <= lastFromTime)
                {
                    // This entry does not overlap with any previous entries.
                    // We can just add it.
                    results.Add(ToMsg(entry));
                    lastFromTime = entry.FromTime;
                    lastToTime = entry.ToTime;
                    continue;
                }

                lastToTime = entry.ToTime;
                lastFromTime = entry.FromTime < lastFromTime ? entry.FromTime : lastFromTime;
                var candidateEntryMsg = ToMsg(entry);
                var insertAt = results.Count;

                for (var i = results.Count - 1; i >= 0; i--)
                {
                    var existingResult = results[i];

                    if (existingResult.FromTime >= entry.ToTime)
                    {
                        // NOTE: This branch is theoretically impossible. But I'll keep it just in case.
                        var callStack = new StackFrame(1, true);
                        await _userEventsService.RecordEvent(new UserEvent
                        {
                            Category = "system",
                            Name = "impossible_point",
                            Value = $"Location: {callStack.GetFileName()}:{callStack.GetFileLineNumber()}; poll: {pollId}"
                        });

                        break;
                    }

                    // Determine the relative priority of the two entries.
                    // The newest wins.
                    if (existingResult.CreatedTimeUtc >= entry.CreatedTimeUtc)
                    {
                        // The existing entry wins. We'll have to cut off the candidateEntry here.
                        // Because the entries are already sorted by ToTime (desc) and by
                        // CreatedTimeUtc (desc), we're guaranteed that this entry cannot extend
                        // any farther.
                        candidateEntryMsg.TimeBlockLength = existingResult.FromTime - candidateEntryMsg.FromTime;
                        break;
                    }

                    // If we got this far, then the new entry overwrites existingResult.
                    // the new entry may cut off one of the old entry's ends, it may completely 
                    // overwrite it, or it may split the older entry into two.
                    if (existingResult.FromTime >= entry.FromTime 
                        && existingResult.GetToTime() <= entry.ToTime)
                    {
                        // NOTE: This branch is theoretically impossible. But I'll keep it just in case.
                        var callStack = new StackFrame(1, true);
                        await _userEventsService.RecordEvent(new UserEvent
                        {
                            Category = "system",
                            Name = "impossible_point",
                            Value = $"Location: {callStack.GetFileName()}:{callStack.GetFileLineNumber()}; poll: {pollId}"
                        });

                        // The existing result is completely covered by the new entry.
                        // Remove it.
                        results.RemoveAt(i);
                        insertAt--;
                        continue;
                    }
                    else if (existingResult.FromTime < entry.FromTime
                            && existingResult.GetToTime() > entry.ToTime)
                    {
                        // The existing result is split in two.
                        // Also, we're done, we don't need to search through any more entries.
                        var earlierTail = existingResult.CloneTimeLogEntryMsgWithDeletionMarker(); ;
                        earlierTail.TimeBlockLength = entry.FromTime - earlierTail.FromTime;
                        results.Insert(i + 1, earlierTail);

                        var laterTail = existingResult;
                        var laterTailToTime = laterTail.GetToTime();
                        laterTail.FromTime = entry.ToTime;
                        laterTail.TimeBlockLength = laterTailToTime - entry.ToTime;
                        break;
                    }
                    else if(existingResult.GetToTime() > entry.ToTime)
                    {
                        // The new entry bit of the beginning of this entry.
                        // Also, we're done, we don't need to search through any more entries.
                        var existingResultToTime = existingResult.GetToTime();
                        existingResult.FromTime = entry.ToTime;
                        existingResult.TimeBlockLength = existingResultToTime - entry.ToTime;
                        break;
                    }
                    else // if (existingResult.FromTime < candidateEntryMsg.FromTime)
                    {
                        // NOTE: This branch is theoretically impossible. But I'll keep it just in case.
                        // The new entry bit off the end of the existing entry.
                        // Adjust the existing entry and move on.
                        existingResult.TimeBlockLength = candidateEntryMsg.FromTime - existingResult.FromTime;
                        insertAt--;
                    }
                }

                if (candidateEntryMsg.TimeBlockLength > TimeSpan.Zero)
                {
                    results.Insert(insertAt, candidateEntryMsg);
                }
            }

            // Remove the deletions.
            var resultsWithoutDeletions = results.Where(r => !r.IsDeletion)
                                                .Select(r => (TimeLogEntryMsg)r)
                                                .ToList();
            return resultsWithoutDeletions;
        }

        public async Task Add(MainDbContext db, Guid pollId, IList<PollResponseAddRequest> reqs)
        {
            var createdTimeUtc = _timeService.UtcNow;

            for (int i = 0; i < reqs.Count; i++)
            {
                var req = reqs[i];
                ValidatePollResponseAddRequest(req, i);

                // Round down to the nearest minute.
                var savedFromTime = ToStartOfMinute(req.TimeCollected);

                var newEntry = new TimeLogEntry
                {
                    Id = Guid.NewGuid(),
                    PollId = pollId,
                    FromTime = savedFromTime,
                    ToTime = savedFromTime + req.TimeBlockLength,
                    EntryText = req.ResponseText,
                    CreatedTimeUtc = createdTimeUtc,
                    TimeZone = req.TimeZone,
                    TimeZoneOffset = req.TimeZoneOffset,
                    SubmissionType = req.SubmissionType,
                };

                db.TimeLogEntries.Add(newEntry);
            }

            await db.SaveChangesAsync();
        }

        public async Task<TimeLogEntryMsg> Undo(MainDbContext db, Guid pollId, Guid timeLogEntryId)
        {
            // Find the entry.
            var targetEntry = await db.TimeLogEntries.FirstOrDefaultAsync(e => e.PollId == pollId
                                                                                && e.Id == timeLogEntryId);

            if (targetEntry == null)
            {
                throw new NotFoundException($"Could not find timeLogEntry with id = {timeLogEntryId}.");
            }

            if (targetEntry.IsUndo())
            {
                throw new BadRequestException($"Cannot undo another undo action.");
            }

            var undoEntry = targetEntry.CopyAndChangeId();
            undoEntry.UndoTarget = timeLogEntryId;
            undoEntry.CreatedTimeUtc = _timeService.UtcNow;

            db.TimeLogEntries.Add(undoEntry);
            await db.SaveChangesAsync();

            return ToMsg(targetEntry);
        }

        public async Task Delete(MainDbContext db, Guid pollId, TimeLogDeleteRequest req)
        {
            if (req.Deletions == null)
            {
                throw new BadRequestException("'deletions' field is not optional.");
            }

            var sortedDeletions = req.Deletions.OrderByDescending(d => d.ToTime).ToList();
            var deletionEntries = new List<TimeLogEntry>(sortedDeletions.Count);

            TimeLogEntry currentEntry = null;
            var createdTimeUtc = _timeService.UtcNow;

            for (var i = 0; i < sortedDeletions.Count; i++)
            {
                var deletion = sortedDeletions[i];

                // Adjust and validate time ranges.
                var fromTime = ToStartOfMinute(deletion.FromTime);
                var toTime = ToStartOfMinute(deletion.ToTime);

                if (fromTime >= toTime)
                {
                    throw new BadRequestException(
                        $"'fromTime' must be before 'toTime' after truncating to the start of minute. " +
                        $"In deletion at position {i + 1} found 'fromTime': '{fromTime}', " +
                        $"'toTime': {toTime}.");
                }

                // See if we need to extend the range or start a new one.
                // We don't need to compare fromTime or currentEntry.ToTime because
                // the entries are sorted by toTime desc.
                if (currentEntry != null && toTime >= currentEntry.FromTime)
                {
                    // The entries overlap. Combine them into a single entry.
                    currentEntry.FromTime = fromTime;
                }
                else
                {
                    // Need to start a new entry.
                    if (currentEntry != null)
                    {
                        db.TimeLogEntries.Add(currentEntry);
                    }

                    currentEntry = new TimeLogEntry
                    {
                        Id = Guid.NewGuid(),
                        FromTime = fromTime,
                        ToTime = toTime,
                        EntryText = "[deletion]",
                        TimeZone = deletion.TimeZone,
                        TimeZoneOffset = deletion.TimeZoneOffset,
                        CreatedTimeUtc = createdTimeUtc,
                        IsDeletion = true,
                        PollId = pollId,
                    };
                }
            }

            // Save the last entry.
            if (currentEntry != null)
            {
                db.TimeLogEntries.Add(currentEntry);
            }

            await db.SaveChangesAsync();

            return;
        }

        public async Task Update(MainDbContext db, Guid pollId, TimeLogUpdateRequest req)
        {
            if ((req.Deletions == null || req.Deletions.Count == 0)
                && (req.Additions == null || req.Additions.Count == 0))
            {
                throw new BadRequestException("Must provide additions or deletions.");
            }

            var createdTimeUtc = _timeService.UtcNow;

            // Process deletions.
            if (req.Deletions != null)
            {
                var sortedDeletions = req.Deletions.OrderByDescending(d => d.ToTime).ToList();
                var deletionEntries = new List<TimeLogEntry>(sortedDeletions.Count);
                var deletionCreatedTimeUtc = createdTimeUtc - TimeSpan.FromMilliseconds(1);

                TimeLogEntry currentEntry = null;

                for (var i = 0; i < sortedDeletions.Count; i++)
                {
                    var deletion = sortedDeletions[i];

                    // Adjust and validate time ranges.
                    var fromTime = ToStartOfMinute(deletion.FromTime);
                    var toTime = ToStartOfMinute(deletion.ToTime);

                    if (fromTime >= toTime)
                    {
                        throw new BadRequestException(
                            $"'fromTime' must be before 'toTime' after truncating to the start of minute. " +
                            $"In deletion at position {i + 1} found 'fromTime': '{fromTime}', " +
                            $"'toTime': {toTime}.");
                    }

                    // See if we need to extend the range or start a new one.
                    // We don't need to compare fromTime or currentEntry.ToTime because
                    // the entries are sorted by toTime desc.
                    if (currentEntry != null && toTime >= currentEntry.FromTime)
                    {
                        // The entries overlap. Combine them into a single entry.
                        currentEntry.FromTime = fromTime;
                    }
                    else
                    {
                        // Need to start a new entry.
                        if (currentEntry != null)
                        {
                            db.TimeLogEntries.Add(currentEntry);
                        }

                        currentEntry = new TimeLogEntry
                        {
                            Id = Guid.NewGuid(),
                            FromTime = fromTime,
                            ToTime = toTime,
                            EntryText = "[deletion]",
                            TimeZone = deletion.TimeZone,
                            TimeZoneOffset = deletion.TimeZoneOffset,
                            CreatedTimeUtc = deletionCreatedTimeUtc,
                            IsDeletion = true,
                            PollId = pollId,
                        };
                    }
                }

                // Save the last deletion.
                if (currentEntry != null)
                {
                    db.TimeLogEntries.Add(currentEntry);
                }
            }

            // Process additions.
            if (req.Additions != null)
            {
                for (int i = 0; i < req.Additions.Count; i++)
                {
                    var additionReq = req.Additions[i];
                    ValidatePollResponseAddRequest(additionReq, i);

                    // Round down to the nearest minute.
                    var savedFromTime = ToStartOfMinute(additionReq.TimeCollected);

                    var newEntry = new TimeLogEntry
                    {
                        Id = Guid.NewGuid(),
                        PollId = pollId,
                        FromTime = savedFromTime,
                        ToTime = savedFromTime + additionReq.TimeBlockLength,
                        EntryText = additionReq.ResponseText,
                        CreatedTimeUtc = createdTimeUtc,
                        TimeZone = additionReq.TimeZone,
                        TimeZoneOffset = additionReq.TimeZoneOffset,
                        SubmissionType = additionReq.SubmissionType,
                    };

                    db.TimeLogEntries.Add(newEntry);
                }
            }

            await db.SaveChangesAsync();
        }

        // ===================== Private ======================
        private static readonly long TicksPerMinute = TimeSpan.FromMinutes(1).Ticks;

        private ITimeService _timeService;
        private IUserEventsService _userEventsService;

        private TimeLogEntryMsgWithDeletionMarker ToMsg(TimeLogEntry timeLogEntry)
        {
            return new TimeLogEntryMsgWithDeletionMarker
            {
                Id = timeLogEntry.Id,
                FromTime = timeLogEntry.FromTime,
                TimeBlockLength = timeLogEntry.ToTime - timeLogEntry.FromTime,
                EntryText = timeLogEntry.EntryText,
                CreatedTimeUtc = timeLogEntry.CreatedTimeUtc,
                IsDeletion = timeLogEntry.IsDeletion,
                SubmissionType = timeLogEntry.SubmissionType,
            };
        }

        private static DateTime ToStartOfMinute(DateTime time)
        {
            return new DateTime((time.Ticks / TicksPerMinute) * TicksPerMinute);
        }

        private void ValidatePollResponseAddRequest(PollResponseAddRequest req, int position)
        {
            var entryText = req.ResponseText;
            var prefix = $"Error in entry at position {position + 1}: ";

            if (string.IsNullOrWhiteSpace(entryText))
            {
                throw new BadRequestException(prefix + "entryText cannot be missing or whitespace.");
            }

            if (entryText.Length > TimeLogEntry.MaxEntryTextLength)
            {
                throw new BadRequestException(prefix + $"entryText cannot be longer than {TimeLogEntry.MaxEntryTextLength} characters.");
            }

            var timeZone = req.TimeZone;
            if (timeZone != null && timeZone.Length > TimeLogEntry.MaxTimeZoneLength)
            {
                throw new BadRequestException(prefix + $"timeZone cannot be longer than {TimeLogEntry.MaxTimeZoneLength} characters.");
            }

            var timeBlockLength = req.TimeBlockLength;
            if (timeBlockLength.TotalMilliseconds <= 0)
            {
                throw new BadRequestException(prefix + $"timeBlockLength must be positive; was: {timeBlockLength}.");
            }

            if (timeBlockLength > MaxAllowedTimeBlockLength)
            {
                throw new BadRequestException(prefix + $"timeBlockLength cannot be longer than {MaxAllowedTimeBlockLength.TotalDays} days. " +
                                              $"Was: {timeBlockLength}");
            }
        }
    }
}
