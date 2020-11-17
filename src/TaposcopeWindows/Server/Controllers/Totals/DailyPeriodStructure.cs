using System;
using System.Collections.Generic;

namespace Server.Controllers.Totals
{
    public class DailyPeriodStructure : PeriodStructureBase
    {
        public DailyPeriodStructure(DateTime from, DateTime to) : base()
        {
            // Load the responses in the specified time range.
            FromTime = from.Date;
            ToTime = to.Date.AddDays(1); // +1 day because we process responses until the END of toDate.
            NumPeriods = (int)Math.Round((ToTime - FromTime).TotalDays);
        }

        public override int CalcEntryPeriodIndex(DateTime timeLogEntryFromTime)
        {
            // Assume that timeCollected is in the valid range.
            var dateCollected = timeLogEntryFromTime.Date;
            var dateIndex = (int)Math.Round((dateCollected - FromTime).TotalDays);
            return dateIndex;
        }

        public override List<DateTime> GetPeriodStartDates()
        {
            var dates = new List<DateTime>(NumPeriods);

            for (int i = 0; i < NumPeriods; i++)
            {
                dates.Add(FromTime.AddDays(i));
            }

            return dates;
        }
    }
}
