using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;

namespace Messages
{
    public class PollMsg
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public TimeSpan ActiveFrom { get; set; }
        public TimeSpan ActiveTo { get; set; }
        public TimeSpan DesiredFrequency { get; set; }

        [JsonConverter(typeof(StringEnumConverter))]
        public PollType PollType { get; set; }

        public IList<PollFixedOption> FixedOptions { get; set; }
        public bool WasStarted { get; set; }
        public DateTime? StartedAt { get; set; }
    }
}
