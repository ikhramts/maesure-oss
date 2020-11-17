using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers.Totals
{
    public abstract class PeriodStructureBase
    {
        protected PeriodStructureBase()
        {
        }

        public DateTime FromTime { get; protected set; }
        public DateTime ToTime { get; protected set; }
        public int NumPeriods { get; protected set; }

        public abstract List<DateTime> GetPeriodStartDates();
        public abstract int CalcEntryPeriodIndex(DateTime timeLogEntryFromTime);
    }
}
