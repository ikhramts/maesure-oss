using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace Server.Db
{
    public class Poll
    {
        public const int MaxDesiredFrequencyMin = 60;

        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public TimeSpan ActiveFrom { get; set; }
        public TimeSpan ActiveTo { get; set; }
        public TimeSpan DesiredFrequency { get; set; }

        [Column(TypeName = "text")]
        public Messages.PollType PollType { get; set; }

        public List<PollFixedOption> PollFixedOptions { get; set; }
        public bool WasStarted { get; set; }

        // Unlike many other dates in this application, this is stored in UTC and represents 
        // an absolute point in time, not one in the user's time zone.
        // In part this is because it works out easier technically.
        public DateTime? StartedAt {
            get {
                if (_startedAt != null)
                {
                    return DateTime.SpecifyKind(_startedAt.Value, DateTimeKind.Utc);
                }
                else
                {
                    return null;
                }
            }
            set
            {
                _startedAt = value;
            }
        }


        // ==================== Private ========================
        private DateTime? _startedAt;
    }
}
