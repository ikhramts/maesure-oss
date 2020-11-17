using System;

namespace Server.Db
{
    public class PollResponse
    {
        public const int MaxResponseTextLength = 200;
        public const int MaxTimeZoneLength = 200;

        public Guid Id { get; set; }
        public Guid PollId { get; set; }
        public DateTime TimeCollected { get; set; }
        public int ResponseOption { get; set; }
        public string ResponseText { get; set; }
        public TimeSpan TimeBlockLength { get; set; }
        public TimeSpan? TimeZoneOffset { get; set; }
        public string TimeZone { get; set; }

        public DateTime? CreatedTimeUtc
        {
            get
            {
                if (_createdTimeUtc != null)
                {
                    return DateTime.SpecifyKind(_createdTimeUtc.Value, DateTimeKind.Utc);
                }
                else
                {
                    return null;
                }
            }
            set { _createdTimeUtc = value; }
        }

        //================= Private ==================
        private DateTime? _createdTimeUtc;
    }
}
