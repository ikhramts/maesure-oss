using System;

namespace Server.Db
{
    public class PollFixedOption
    {
        public Guid Id { get; set; }
        public Guid PollId { get; set; }
        public string OptionText { get; set; }
        public string Color { get; set; }
        public int Position { get; set; }
    }
}
