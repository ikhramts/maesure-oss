using System;
using System.Collections.Generic;

namespace Server.Controllers.Summaries
{
    public class DailySummaryReply
    {
        public IEnumerable<DateTime> Dates { get; set; }
        public IEnumerable<DailySummaryForActivity> Activities { get; set; }
        public IEnumerable<DailySummaryForActivity> Uncategorized { get; set; }
    }
}
