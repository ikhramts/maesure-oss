using System;
using System.Collections.Generic;

namespace Server.Controllers.Totals
{
    public class TotalsReply
    {
        public IEnumerable<DateTime> StartingDates { get; set; }
        public IEnumerable<TotalsForActivity> Activities { get; set; }
    }
}
