using System;

namespace Messages
{
    public class PollResponseAddRequest : ICloneable
    {
        public PollResponseAddRequest()
        {

        }

        // TODO: delete
        public Guid? ClientId { get; set; }

        // TODO: delete
        public Guid? PollId { get; set; }
        public DateTime TimeCollected { get; set; }
        public string ResponseText { get; set; }
        public TimeSpan TimeBlockLength { get; set; }
        public TimeSpan TimeZoneOffset { get; set; }
        public string TimeZone { get; set; }
        public string SubmissionType { get; set; }

        public PollResponseAddRequest Clone()
        {
            return (PollResponseAddRequest)MemberwiseClone();
        }

        object ICloneable.Clone()
        {
            return Clone();
        }
    }
}
