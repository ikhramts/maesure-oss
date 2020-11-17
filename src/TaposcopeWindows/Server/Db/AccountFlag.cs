using System;

namespace Server.Db
{
    public class AccountFlag
    {
        public const int MaxNameLength = 200;

        public Guid Id { get; set; }
        public Guid AccountId { get; set; }
        public string Name { get; set; }
        public bool Value { get; set; }

        public DateTime LastChangedTimeUtc
        {
            get
            {
                return DateTime.SpecifyKind(_lastChangedTimeUtc.Value, DateTimeKind.Utc);
            }
            set { _lastChangedTimeUtc = value; }
        }

        //================= Private ==================
        private DateTime? _lastChangedTimeUtc;
    }
}
