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

namespace Server.Controllers.Totals
{
    [ApiController]
    [Route("api/totals")]
    public class TotalsController : AppControllerBase
    {
        public const int MaxAllowedDaysInRange = 10 * 365;

        public const string Day = "day";
        public const string Month = "month";
        public const string Week = "week";
        public const string Custom = "custom";

        public TotalsController(
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
        public async Task<TotalsReply> Get([FromQuery] string groupBy, [FromQuery] DateTime from, [FromQuery] DateTime to)
        {
            // Basic validation.
            if (to < from)
            {
                throw new BadRequestException("'from' parameter cannot be after 'to'.");
            }

            // Select the right grouping period structure.
            // We'll strip off the time zone information to avoid any issues.
            var cleanedFrom = DateTime.SpecifyKind(from, DateTimeKind.Unspecified);
            var cleanedTo = DateTime.SpecifyKind(to, DateTimeKind.Unspecified);

            PeriodStructureBase periodStructure;

            if (groupBy == Day)
            {
                periodStructure = new DailyPeriodStructure(cleanedFrom, cleanedTo);
            }
            else if (groupBy == Week)
            {
                periodStructure = new WeeklyPeriodStructure(cleanedFrom, cleanedTo);
            }
            else if (groupBy == Month)
            {
                periodStructure = new MonthlyPeriodStructure(cleanedFrom, cleanedTo);
            }
            else if (groupBy == Custom)
            {
                periodStructure = new CustomPeriodStructure(cleanedFrom, cleanedTo);
            }
            else if (string.IsNullOrEmpty(groupBy))
            {
                throw new BadRequestException("Must provide a valid 'groupBy' field.");
            }
            else
            {
                throw new BadRequestException($"Unsupported 'groupBy' value: '{groupBy}'");
            }

            // Load the responses in the specified time range.
            var fromTime = periodStructure.FromTime;
            var toTime = periodStructure.ToTime;
            var numDays = (int)Math.Round((toTime - fromTime).TotalDays);

            if (numDays > MaxAllowedDaysInRange)
            {
                throw new BadRequestException($"The requested date range cannot have more than {MaxAllowedDaysInRange} days.");
            }

            // Load the responses for that time range.
            var poll = await GetDefaultPollAsync();
            var timeLogEntries = await _timeLogService.Get(Db, poll.Id, fromTime, toTime);

            // Trim the ends to make sure that we count only the time from the first and last entry that fits
            // into the range.
            if (timeLogEntries.Count > 0)
            {
                var lastEntry = timeLogEntries[timeLogEntries.Count - 1];

                if (lastEntry.FromTime < fromTime)
                {
                    lastEntry.TimeBlockLength = lastEntry.TimeBlockLength - (fromTime - lastEntry.FromTime);
                    lastEntry.FromTime = fromTime;
                }

                var firstEntry = timeLogEntries[0];

                if (firstEntry.GetToTime() > toTime)
                {
                    firstEntry.TimeBlockLength = firstEntry.TimeBlockLength - (firstEntry.GetToTime() - toTime);
                }
            }

            // Load the user's ActivityGroup hierarchy.
            var activityGroups = await Db.ActivityGroups.Where(g => g.PollId == poll.Id).ToListAsync();
            var activityHierarchy = new ActivityGroupHierarchy(activityGroups, _loggerFactory);

            // Prepare for calculation.
            var totalsReply = new TotalsReply();
            totalsReply.StartingDates = periodStructure.GetPeriodStartDates();
            var summariesByActivity = new Dictionary<string, TotalsForActivity>();

            // Initial pass - find all activities.
            var totalsHierarchy = new TotalsHierarchy(activityHierarchy, periodStructure.NumPeriods);

            foreach (var timeLogEntry in timeLogEntries)
            {
                int dateIndex = -2;

                try
                {
                    var summaryForActivity = totalsHierarchy.GetOrAddActivity(timeLogEntry.EntryText);
                    dateIndex = periodStructure.CalcEntryPeriodIndex(timeLogEntry.FromTime);

                    summaryForActivity.TimeSpentPerPeriod[dateIndex] =
                        summaryForActivity.TimeSpentPerPeriod[dateIndex] + timeLogEntry.TimeBlockLength;
                }
                catch (ArgumentOutOfRangeException ex)
                {
                    throw new Exception($"Totals IndexOutOfRangeException. Account: {Account.Id}; dateIndex: {dateIndex}", ex);
                }
            }


            // Additional passes - aggregate and clean up the data.
            totalsHierarchy.RecalculateTimeTotals();
            totalsHierarchy.PruneEmptyLeafs();

            // Compose the response.
            totalsReply.Activities = totalsHierarchy.GetActivities();

            return totalsReply;
        }
    

        // ========================== Private ========================
        private ILoggerFactory _loggerFactory;
        private ITimeLogService _timeLogService;
    }
}
