using System;
using System.Collections.Generic;
using System.Text;

namespace Messages
{
    public class TimeLogDeletedRange
    {
        public DateTime FromTime { get; set; }
        public DateTime ToTime { get; set; }
        public TimeSpan TimeZoneOffset { get; set; }
        public string TimeZone { get; set; }

    }
}
