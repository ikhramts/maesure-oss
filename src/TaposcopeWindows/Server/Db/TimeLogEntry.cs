using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Server.Db
{
    [Table("time_log_entries")]
    public class TimeLogEntry
    {
        public const int MaxEntryTextLength = 200;
        public const int MaxTimeZoneLength = 200;

        public Guid Id { get; set; }
        public Guid PollId { get; set; }
        public DateTime FromTime { get; set; }
        public DateTime ToTime { get; set; }
        public string EntryText { get; set; }
        public TimeSpan TimeZoneOffset { get; set; }
        public string TimeZone { get; set; }
        public Guid? UndoTarget { get; set; }
        public bool IsDeletion { get; set; } = false;
        public string SubmissionType { get; set; }


        public DateTime CreatedTimeUtc
        {
            get
            {
                return DateTime.SpecifyKind(_createdTimeUtc.Value, DateTimeKind.Utc);
            }
            set { _createdTimeUtc = value; }
        }

        public TimeLogEntry CopyAndChangeId()
        {
            var copy = (TimeLogEntry)MemberwiseClone();
            copy.Id = Guid.NewGuid();
            return copy;
        }

        public bool IsUndo()
        {
            return UndoTarget != null;
        }

        public TimeSpan GetTimeBlockLength()
        {
            return ToTime - FromTime;
        }

        //================= Private ==================
        private DateTime? _createdTimeUtc;
    }
}
