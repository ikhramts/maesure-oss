using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace Server.Db
{
    public class ActivityGroup
    {
        public const int MaxNameLength = 200;
        public const int MaxMatchResponseTextLength = PollResponse.MaxResponseTextLength;

        public Guid Id { get; set; }
        public Guid PollId { get; set; }
        public string Name { get; set; }
        public Guid? ParentId { get; set; }
        public int Position { get; set; }
        public string MatchResponseText { get; set; }
        public bool IsUncategorized { get; set; }

        [NotMapped]
        public IEnumerable<ActivityGroup> Children { get; set; }

        public bool HasChildren()
        {
            return Children != null && Children.Any();
        }
    }
}
