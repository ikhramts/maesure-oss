using System;
using System.Collections.Generic;
using System.Text;

namespace Messages
{
    public class AccountFlagSetRequest
    {
        public Dictionary<string, bool> Flags { get; set; }
    }
}
