using System;
using System.Collections.Generic;
using System.Text;

namespace Messages
{
    public class TimeLogsReplyMsg
    {
        public IList<TimeLogEntryMsg> Entries { get; set; }
    }
}
