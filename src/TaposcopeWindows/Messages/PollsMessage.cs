using System;
using System.Collections.Generic;
using System.Text;

namespace Messages
{
    public class PollsMessage
    {
        public IList<PollMsg> Polls { get; set; }
    }
}
