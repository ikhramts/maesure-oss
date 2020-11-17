using System;
using System.Collections.Generic;
using System.Text;

namespace Messages
{
    public class ClientCheckinRequest
    {
        public string ClientType { get; set; }
        public string ClientVersion { get; set; }
    }
}
