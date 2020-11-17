using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.ActivityGroups;
using Server.Services.TimeLog;
using Server.Services.UserEvents;

namespace Server.Controllers.Summaries
{
    [ApiController]
    [Route("api/summaries/daily-summary")]
    public class DailySummaryController : AppControllerBase
    {
        public const int MaxAllowedDaysInRange = 10 * 365;

        public DailySummaryController(
            MainDbContext db, 
            ITimeLogService timeLogService,
            ILoggerFactory loggerFactory, 
            IUserEventsService userEventsService)
            : base(db, userEventsService)
        {
            _loggerFactory = loggerFactory;
            _timeLogService = timeLogService;
        }

        [HttpGet]
        public async Task<DailySummaryReply> Get([FromQuery] DateTime from, [FromQuery] DateTime to)
        {
            // Basic validation.
            if (to < from)
            {
                throw new BadRequestException("'from' parameter cannot be after 'to'.");
            }

            // Load the responses in the specified time range.
            // We'll strip off the time zone information to avoid any issues.
            var fromDate = DateTime.SpecifyKind(from.Date, DateTimeKind.Unspecified);
            var toDate = DateTime.SpecifyKind(to.Date.AddDays(1), DateTimeKind.Unspecified); // +1 day because we process responses until the END of toDate.
            var numDays = (int)Math.Round((toDate - fromDate).TotalDays);

            if (numDays > MaxAllowedDaysInRange)
            {
                throw new BadRequestException($"The requested date range cannot have more than {MaxAllowedDaysInRange} days.");
            }

            // Load the responses for that time range.
            var poll = await GetDefaultPollAsync();
            var timeLogEntries = await _timeLogService.Get(Db, poll.Id, fromDate, toDate);

            // Trim the ends to make sure that we count only the time from the first and last entry that fits
            // into the range.
            if (timeLogEntries.Count > 0)
            {
                var firstEntry = timeLogEntries[0];

                if (firstEntry.FromTime < fromDate)
                {
                    firstEntry.TimeBlockLength = firstEntry.TimeBlockLength - (fromDate - firstEntry.FromTime);
                    firstEntry.FromTime = fromDate;
                }

                var lastEntry = timeLogEntries[timeLogEntries.Count - 1];

                if (lastEntry.GetToTime() > toDate)
                {
                    lastEntry.TimeBlockLength = lastEntry.TimeBlockLength - (lastEntry.GetToTime() - toDate);
                }
            }
            
            // Load the user's ActivityGroup hierarchy.
            var activityGroups = await Db.ActivityGroups.Where(g => g.PollId == poll.Id).ToListAsync();
            var activityHierarchy = new ActivityGroupHierarchy(activityGroups, _loggerFactory);

            // Prepare for calculation.
            var dailySummary = new DailySummaryReply();
            dailySummary.Dates = GenerateDates(fromDate, numDays);
            var summariesByActivity = new Dictionary<string, DailySummaryForActivity>();

            // Initial pass - find all activities.
            var dailySummaryHierarchy = new DailySummaryHierarchy(activityHierarchy, numDays);

            foreach (var timeLogEntry in timeLogEntries)
            {
                var summaryForActivity = dailySummaryHierarchy.GetOrAddActivity(timeLogEntry.EntryText);
                var dateIndex = CalcDateIndex(timeLogEntry.FromTime, fromDate);
                summaryForActivity.TimeSpentPerDay[dateIndex] = 
                    summaryForActivity.TimeSpentPerDay[dateIndex] + timeLogEntry.TimeBlockLength;
            }

            // Additional passes - aggregate and clean up the data.
            dailySummaryHierarchy.RecalculateTimeTotals();
            dailySummaryHierarchy.PruneEmptyLeafs();

            // Compose the response.
            dailySummary.Activities = dailySummaryHierarchy.GetActivities();

            return dailySummary;
        }

        // ========================== Private ========================
        private ILoggerFactory _loggerFactory;
        private ITimeLogService _timeLogService;

        private static List<DateTime> GenerateDates(DateTime fromDate, int numDays)
        {
            var dates = new List<DateTime>(numDays);

            for (int i = 0; i < numDays; i++)
            {
                dates.Add(fromDate.AddDays(i));
            }

            return dates;
        }

        private static int CalcDateIndex(DateTime timeCollected, DateTime fromDate)
        {
            // Assume that timeCollected is in the valid range.
            var dateCollected = timeCollected.Date;
            var dateIndex = (int)Math.Round((dateCollected - fromDate).TotalDays);
            return dateIndex;
        }
    }
}
