using System;

namespace Messages
{
    public class ActivityGroupCreateRequest
    {
        public string Name { get; set; }
        public Guid? ParentId { get; set; }
        public string ParentMatchResponseText { get; set; }
        public Guid? GrandparentId { get; set; }
    }
}
