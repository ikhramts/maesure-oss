using System.Collections.Generic;

namespace Messages
{
    public class TimeLogUpdateRequest
    {
        public List<PollResponseAddRequest> Additions { get; set; }
        public List<TimeLogDeletedRange> Deletions { get; set; }
    }
}
