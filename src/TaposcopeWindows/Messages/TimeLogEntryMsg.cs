using System;

namespace Messages
{
    public class TimeLogEntryMsg
    {
        public Guid Id { get; set; }
        public DateTime FromTime { get; set; }
        public string EntryText { get; set; }
        public TimeSpan TimeBlockLength { get; set; }

        public DateTime CreatedTimeUtc { get; set; }
        public string SubmissionType { get; set; }

        public DateTime GetToTime() => FromTime + TimeBlockLength;

        public virtual TimeLogEntryMsg Clone()
        {
            return (TimeLogEntryMsg) MemberwiseClone();
        }
    }
}
