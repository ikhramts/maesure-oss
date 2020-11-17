using Server.Db;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.UserEvents
{
    public class UserEvent
    {
        public string SessionId { get; set; }
        public Account Account { get; set; }
        public string Category { get; set; }
        public string Name { get; set; }
        public string Value { get; set; }
    }
}
