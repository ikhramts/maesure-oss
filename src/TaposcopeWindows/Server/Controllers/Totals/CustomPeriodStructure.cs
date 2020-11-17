using System;
using System.Collections.Generic;

namespace Server.Controllers.Totals
{
    /// <summary>
    /// Period structure consisting of only one period with the user-supplied range.
    /// </summary>
    public class CustomPeriodStructure : PeriodStructureBase
    {
        public CustomPeriodStructure(DateTime from, DateTime to)
        {
            // Load the responses in the specified time range.
            FromTime = from.Date;
            ToTime = to.Date.AddDays(1); // +1 day because we process responses until the END of toDate.
            NumPeriods = 1;
        }

        public override int CalcEntryPeriodIndex(DateTime timeLogEntryFromTime)
        {
            return 0;
        }

        public override List<DateTime> GetPeriodStartDates()
        {
            return new List<DateTime> { FromTime };
        }
    }
}
