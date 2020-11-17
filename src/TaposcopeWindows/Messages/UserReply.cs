using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;

namespace Messages
{
    public class UserReply
    {
        [JsonConverter(typeof(StringEnumConverter))]
        public AccountType AccountType { get; set; }

        [JsonConverter(typeof(StringEnumConverter))]
        public AccountProvider AccountProvider { get; set; } = AccountProvider.None;

        public string Email { get; set; }

        public string Picture { get; set; }

        public DateTime? TrialExpiryUtc { get; set; }

        public int RemainingTrialDays { get; set; }

        public Dictionary<string, bool> Flags { get; set; } = new Dictionary<string, bool>();
    }
}
