using Server.Db;
using Server.Services.ActivityGroups;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Server.Controllers.Totals
{
    public class TotalsHierarchy
    {
        public TotalsHierarchy(ActivityGroupHierarchy activityGroupHierarchy, int numDays)
        {
            _activityGroupHierarchy = activityGroupHierarchy;
            _numDays = numDays;

            BuildSummaryHierarchy();
        }

        public TotalsForActivity GetOrAddActivity(string responseText)
        {
            // Check if we've been this way already.
            _summariesByResponseText.TryGetValue(responseText, out var summary);

            if (summary != null)
                return summary;

            // There is no activity group that matches this response text.
            // That means that the user has not categorized this activity yet.
            summary = new TotalsForActivity(_numDays)
            {
                Key = "name|" + responseText,
                Name = responseText,
                Position = 0,
                TracksPollResponseText = true
            };

            _summariesByResponseText[responseText] = summary;
            _activities.Add(summary);
            return summary;
        }

        public void RecalculateTimeTotals()
        {
            foreach (var summary in _activities)
                RecalculateTimeTotalsForActivity(summary);
        }

        public void PruneEmptyLeafs()
        {
            _activities = PruneEmptyLeafsInList(_activities);
        }

        public IList<TotalsForActivity> GetActivities()
        {
            return _activities;
        }

        //=================== Private ====================
        ActivityGroupHierarchy _activityGroupHierarchy;
        int _numDays;
        List<TotalsForActivity> _activities = new List<TotalsForActivity>();
        Dictionary<string, TotalsForActivity> _summariesByResponseText = new Dictionary<string, TotalsForActivity>();

        private void BuildSummaryHierarchy()
        {
            foreach (var group in _activityGroupHierarchy.Activities)
            {
                var summary = BuildSummaryForActivity(group);
                _activities.Add(summary);
            }
        }

        private TotalsForActivity BuildSummaryForActivity(ActivityGroup activityGroup)
        {

            var summary = new TotalsForActivity(_numDays)
            {
                ActivityGroupId = activityGroup.Id,
                Key = "id|" + activityGroup.Id,
                Name = activityGroup.Name,
                Position = activityGroup.Position,
                ParentActivityGroupId = activityGroup.ParentId,
                TracksPollResponseText = !string.IsNullOrEmpty(activityGroup.MatchResponseText)
            };

            var children = new List<TotalsForActivity>();

            // Add this summary to the ResponseText lookup table.
            if (!string.IsNullOrEmpty(activityGroup.MatchResponseText))
            {
                if (activityGroup.HasChildren())
                {
                    // We need to create another made-up activity group that represents the
                    // exact ResponseText matches.
                    var matchedResponseSummary = new TotalsForActivity(_numDays)
                    {
                        Key = "name|" + activityGroup.MatchResponseText,
                        Name = activityGroup.MatchResponseText,
                        Position = 0,
                        TracksPollResponseText = true,
                        TracksExactParentMatches = true
                    };

                    _summariesByResponseText[activityGroup.MatchResponseText] = matchedResponseSummary;
                    children.Add(matchedResponseSummary);
                }
                else
                {
                    // This is a leaf node.
                    _summariesByResponseText[activityGroup.MatchResponseText] = summary;
                }
            }

            // Populate the children
            if (activityGroup.HasChildren())
            {
                foreach (var childGroup in activityGroup.Children)
                {
                    var childSummary = BuildSummaryForActivity(childGroup);
                    children.Add(childSummary);
                }
            }

            if (children.Any())
                summary.Children = children;

            return summary;
        }

        private void RecalculateTimeTotalsForActivity(TotalsForActivity summary)
        {
            if (!summary.HasChildren())
                // This is a leaf node.
                return;

            var timeSpentPerDay = new TimeSpan[_numDays];

            for (int i = 0; i < _numDays; i++)
                timeSpentPerDay[i] = TimeSpan.Zero;

            foreach (var child in summary.Children)
            {
                RecalculateTimeTotalsForActivity(child);

                for (int i = 0; i < _numDays; i++)
                {
                    timeSpentPerDay[i] += child.TimeSpentPerPeriod[i];
                }
            }

            summary.TimeSpentPerPeriod = timeSpentPerDay;
        }

        private List<TotalsForActivity> PruneEmptyLeafsInList(IList<TotalsForActivity> summaries)
        {
            // Remove any nodes that are unlikely to be useful.
            var prunedSummaries = summaries.Where(s => !s.HasZeroTimeSpent()
                                                       || !s.TracksPollResponseText
                                                       || s.HasChildren())
                                           .OrderBy(s => s.TracksPollResponseText ? 1 : 0)
                                           .ThenBy(s => s.Name.ToLower())
                                           .ToList();

            foreach (var summary in prunedSummaries)
            {
                if (summary.HasChildren())
                    summary.Children = PruneEmptyLeafsInList(summary.Children);
            }

            return prunedSummaries;
        }
    }
}
