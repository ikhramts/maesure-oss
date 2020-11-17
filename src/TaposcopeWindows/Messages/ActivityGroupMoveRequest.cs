using System;

namespace Messages
{
    public class ActivityGroupMoveRequest
    {
        // Must provide one of these, but not both.
        public Guid? Id { get; set; }
        public string MatchResponseText { get; set; }

        // These indicate where we're moving the ActivityGroup.
        public Guid? TargetParentId { get; set; }
        public string TargetParentMatchResponseText { get; set; }
        public Guid? TargetGrandparentId { get; set; }
        
        // Can provide this only if no target parent description is given.
        public bool? TargetIsUncategorized { get; set; }
    }
}
