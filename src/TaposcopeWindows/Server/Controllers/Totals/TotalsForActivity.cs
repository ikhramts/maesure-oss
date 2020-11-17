using System;
using System.Collections.Generic;
using System.Linq;

namespace Server.Controllers.Totals
{
    public class TotalsForActivity
    {
        public string Name { get; set; }
        public Guid? ActivityGroupId { get; set; }
        public Guid? ParentActivityGroupId { get; set; }
        public IList<TimeSpan> TimeSpentPerPeriod { get; set; }
        public IList<TotalsForActivity> Children { get; set; }
        public int Position { get; set; }
        public bool TracksPollResponseText { get; set; }
        public bool TracksExactParentMatches { get; set; }

        public string Key { get; set; }

        public TotalsForActivity()
        {

        }

        public TotalsForActivity(int numDays)
        {
            TimeSpentPerPeriod = new List<TimeSpan>(numDays);

            for (int i = 0; i < numDays; i++)
            {
                TimeSpentPerPeriod.Add(TimeSpan.Zero);
            }
        }

        public bool HasChildren()
        {
            return Children != null && Children.Any();
        }

        public bool HasZeroTimeSpent()
        {
            foreach (var timeSpent in TimeSpentPerPeriod)
            {
                if (timeSpent != TimeSpan.Zero)
                    return false;
            }

            return true;
        }
    }
}
