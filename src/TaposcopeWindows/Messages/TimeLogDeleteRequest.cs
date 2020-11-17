using System;
using System.Collections.Generic;
using System.Text;

namespace Messages
{
    public class TimeLogDeleteRequest
    {
        public IList<TimeLogDeletedRange> Deletions { get; set; }
    }
}
