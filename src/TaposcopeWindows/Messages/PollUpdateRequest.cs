using System;

namespace Messages
{
    public class PollUpdateRequest
    {
        public TimeSpan? ActiveFrom { get; set; }
        public TimeSpan? ActiveTo { get; set; }
        public int? DesiredFrequencyMin { get; set; }
        public bool? WasStarted { get; set; }
        public DateTime? StartedAt { get; set; }
    }
}
