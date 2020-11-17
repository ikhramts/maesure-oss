using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers.Totals
{
    public class WeeklyPeriodStructure : PeriodStructureBase
    {
        public WeeklyPeriodStructure(DateTime from, DateTime to)
        {
            // Round 'from' and 'to' to ends of the week.
            // DateTime.DayOfWeek has Sunday == 0; we'll need to correct it to Monday == 0.
            var fromDayOfWeekOffset = (((int)from.DayOfWeek) + 6) % 7;
            FromTime = from.Date.AddDays(-fromDayOfWeekOffset);

            var toDayOfWeekOffset = (((int)to.DayOfWeek) + 6) % 7;
            ToTime = to.Date.AddDays(7 - toDayOfWeekOffset); // Start of following Monday

            NumPeriods = (int)Math.Round((ToTime - FromTime).TotalDays / 7);
        }

        public override int CalcEntryPeriodIndex(DateTime timeLogEntryFromTime)
        {
            // Assume that timeCollected is in the valid range.
            var dateCollected = timeLogEntryFromTime.Date;
            var weekIndex = ((int)Math.Round((dateCollected - FromTime).TotalDays)) / 7;
            return weekIndex;
        }

        public override List<DateTime> GetPeriodStartDates()
        {
            var dates = new List<DateTime>(NumPeriods);

            for (int i = 0; i < NumPeriods; i++)
            {
                dates.Add(FromTime.AddDays(i * 7));
            }

            return dates;
        }
    }
}
