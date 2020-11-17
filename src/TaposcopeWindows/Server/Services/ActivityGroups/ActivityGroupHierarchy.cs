using Server.Db;
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace Server.Services.ActivityGroups
{
    public class ActivityGroupHierarchy
    {
        public IEnumerable<ActivityGroup> Activities => _activities;

        public ActivityGroupHierarchy(IEnumerable<ActivityGroup> groups, ILoggerFactory loggerFactory)
        {
            _log = loggerFactory.CreateLogger<ActivityGroupHierarchy>();
            _activityGroupsById = groups.ToDictionary(g => g.Id);
            BuildHierarchy(groups);
        }

        //================== Private ======================
        private List<ActivityGroup> _rootActivities = new List<ActivityGroup>();
        private Dictionary<Guid, ActivityGroup> _activityGroupsById = new Dictionary<Guid, ActivityGroup>();

        private List<ActivityGroup> _activities = new List<ActivityGroup>();
        private ILogger<ActivityGroupHierarchy> _log;

        private void BuildHierarchy(IEnumerable<ActivityGroup> groups)
        {
            foreach (var group in groups)
            {
                // Check whether this is a top-level activity group.
                if (group.ParentId == null)
                {
                    _activities.Add(group);
                    continue;
                }

                // This is not a top-level activity group.
                _activityGroupsById.TryGetValue(group.ParentId.Value, out var parent);

                // This should not happen.
                if (parent == null)
                {
                    _log.LogWarning($"ActivityGroup {group.Id} for poll {group.PollId} is supposed to " +
                        $"have parent {group.ParentId.Value} which was not found.");

                    continue;
                }

                if (parent.Children == null)
                    parent.Children = new List<ActivityGroup>();

                ((List<ActivityGroup>)parent.Children).Add(group);
            }
        }
    }
}
