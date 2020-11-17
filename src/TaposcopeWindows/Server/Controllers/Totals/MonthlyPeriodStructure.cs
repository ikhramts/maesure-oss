using System;
using System.Collections.Generic;

namespace Server.Controllers.Totals
{
    public class MonthlyPeriodStructure : PeriodStructureBase
    {
        public MonthlyPeriodStructure(DateTime from, DateTime to)
        {
            FromTime = new DateTime(from.Year, from.Month, 1);
            ToTime = new DateTime(to.Year, to.Month, 1).AddMonths(1);
            var fromTotalMonths = FromTime.Year * 12 + FromTime.Month;
            var toTotalMonths = ToTime.Year * 12 + ToTime.Month;
            NumPeriods = toTotalMonths - fromTotalMonths;
        }

        public override int CalcEntryPeriodIndex(DateTime timeLogEntryFromTime)
        {
            var fromTotalMonths = FromTime.Year * 12 + FromTime.Month;
            var entryTotalMonths = timeLogEntryFromTime.Year * 12 + timeLogEntryFromTime.Month;
            return entryTotalMonths - fromTotalMonths;
        }

        public override List<DateTime> GetPeriodStartDates()
        {
            var dates = new List<DateTime>(NumPeriods);

            for (int i = 0; i < NumPeriods; i++)
            {
                var date = FromTime.AddMonths(i);
                dates.Add(date);
            }

            return dates;
        }
    }
}
