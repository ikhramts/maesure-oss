using System;
using System.Collections.Generic;
using System.Linq;

namespace Server.Controllers.Summaries
{
    public class DailySummaryForActivity
    {
        public string Name { get; set; }
        public Guid? ActivityGroupId { get; set; }
        public Guid? ParentActivityGroupId { get; set; }
        public IList<TimeSpan> TimeSpentPerDay { get; set; }
        public IList<DailySummaryForActivity> Children { get; set; }
        public int Position { get; set; }
        public bool TracksPollResponseText { get; set; }
        public bool TracksExactParentMatches { get; set; }

        public string Key { get; set; }

        public DailySummaryForActivity()
        {

        }

        public DailySummaryForActivity(int numDays)
        {
            TimeSpentPerDay = new List<TimeSpan>(numDays);

            for (int i = 0; i < numDays; i++)
            {
                TimeSpentPerDay.Add(TimeSpan.Zero);
            }
        }

        public bool HasChildren()
        {
            return Children != null && Children.Any();
        }

        public bool HasZeroTimeSpent()
        {
            foreach (var timeSpent in TimeSpentPerDay)
            {
                if (timeSpent != TimeSpan.Zero)
                    return false;
            }

            return true;
        }
    }
}
