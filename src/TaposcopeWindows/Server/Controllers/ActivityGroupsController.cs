using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Db;
using Server.Services.UserEvents;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/activity-groups")]
    public class ActivityGroupsController : AppControllerBase
    {
        public ActivityGroupsController(MainDbContext db, IUserEventsService userEventsService) 
            : base(db, userEventsService)
        {
        }

        [HttpPut]
        public async Task<IActionResult> Create([FromBody] Messages.ActivityGroupCreateRequest request)
        {
            // Validate that the user is logged in.
            var account = await GetCurrentAccountAsync();

            if (account == null)
            {
                return Unauthorized();
            }

            // Basic validation.
            var nameError = ValidateName(request.Name);
            if (nameError != null)
                return nameError;

            var parentError = ValidateParentDescription(request.ParentId,
                                                        request.ParentMatchResponseText,
                                                        request.GrandparentId,
                                                        "parent");
            if (parentError != null)
                return parentError;

            // Data validation.
            var poll = await GetDefaultPollAsync();

            var parentExistsError = await ValidateGroupExists(poll,
                                                               request.ParentId,
                                                               request.ParentMatchResponseText,
                                                               request.GrandparentId,
                                                               "parent");
            if (parentExistsError != null)
            {
                return parentExistsError;
            }

            // User tracking.
            await UserEventsService.RecordEvent(new UserEvent
            {
                Account = Account,
                Category = "activity_group",
                Name = "create"
            });

            // Create.
            var newGroup = new ActivityGroup
            {
                Id = Guid.NewGuid(),
                ParentId = request.ParentId,
                Name = request.Name,
                PollId = poll.Id,
                Position = 0,
            };

            if (!string.IsNullOrWhiteSpace(request.ParentMatchResponseText))
            {
                var newParent = new ActivityGroup
                {
                    Id = Guid.NewGuid(),
                    ParentId = request.GrandparentId,
                    Name = request.ParentMatchResponseText,
                    MatchResponseText = request.ParentMatchResponseText,
                    Position = 0,
                    PollId = poll.Id
                };

                newGroup.ParentId = newParent.Id;
                Db.ActivityGroups.Add(newParent);
            }

            Db.ActivityGroups.Add(newGroup);
            await Db.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("move")] 
        public async Task<IActionResult> Move([FromBody] Messages.ActivityGroupMoveRequest request)
        {
            // Validate that the user is logged in.
            var account = await GetCurrentAccountAsync();

            if (account == null)
            {
                return Unauthorized();
            }

            // Basic validation.
            if (request.Id != null && !string.IsNullOrWhiteSpace(request.MatchResponseText))
            {
                return BadRequest("Should not provide both 'id' and 'matchResponseText'");
            }
            else if (request.Id == null && string.IsNullOrWhiteSpace(request.MatchResponseText))
            {
                return BadRequest("Must provide either 'id' or 'matchResponseText'");
            }

            var nameError = ValidateLength(request.MatchResponseText, ActivityGroup.MaxMatchResponseTextLength, "matchResponseText");
            if (nameError != null)
                return nameError;

            var parentError = ValidateParentDescription(request.TargetParentId,
                                                        request.TargetParentMatchResponseText,
                                                        request.TargetGrandparentId,
                                                        "targetParent");
            if (parentError != null)
                return parentError;

            if (request.TargetIsUncategorized != null &&
                    (request.TargetParentId != null || !string.IsNullOrWhiteSpace(request.TargetParentMatchResponseText)))
            {
                return BadRequest("Cannot provide 'targetIsUncategorized' when providing target parent details.");
            }

            if (!string.IsNullOrWhiteSpace(request.MatchResponseText)
                && request.MatchResponseText == request.TargetParentMatchResponseText)
            {
                return BadRequest("'matchResponseText' and 'targetParentMatchResponseText' cannot be the same. " +
                    "Cannot make an activity group its own parent.");
            }

            // Data validation.
            Poll poll = null;
            ActivityGroup activityGroup = null;

            if (request.Id != null)
            {
                // This should be an actual activity group. Check if it exists.
                activityGroup = await Db.ActivityGroups.FirstOrDefaultAsync(g => g.Id == request.Id);

                if (activityGroup == null)
                {
                    return NotFound($"Could not find ActivityGroup with id = {request.Id}");
                }

                var pollId = activityGroup.PollId;
                poll = await Db.Polls.FirstOrDefaultAsync(p => p.Id == pollId);

                if (poll == null)
                {
                    throw new Exception($"Could not find a poll wit Id {pollId}");
                }
                else if (poll.AccountId != account.Id)
                {
                    return NotFound($"Could not find ActivityGroup with id = {request.Id}");
                }
            }
            else
            {
                // Confirm that this ActivityGroup does not exist.
                poll = await GetDefaultPollAsync();
                var existingGroup = await Db.ActivityGroups.FirstOrDefaultAsync(g => g.PollId == poll.Id
                                                                                     && g.MatchResponseText == request.MatchResponseText);
                if (existingGroup != null)
                {
                    return BadRequest("There is already an ActivityGroup with matchResponseText = " +
                        $"'{request.MatchResponseText}'. Its id is {existingGroup.Id}. Please target it by its id.");
                }

                // Create the activity group.
                activityGroup = new ActivityGroup
                {
                    Id = Guid.NewGuid(),
                    Name = request.MatchResponseText,
                    MatchResponseText = request.MatchResponseText,
                    PollId = poll.Id,
                    Position = 0
                };

                Db.ActivityGroups.Add(activityGroup);
            }

            var parentExistsError = await ValidateGroupExists(poll,
                                                               request.TargetParentId,
                                                               request.TargetParentMatchResponseText,
                                                               request.TargetGrandparentId,
                                                               "target parent");
            if (parentExistsError != null)
                return parentExistsError;

            // Make sure that this ActivityGroup will not be its own ancestor.
            var nextAncestorId = request.TargetParentId;

            while (nextAncestorId.HasValue)
            {
                var ancestor = await Db.ActivityGroups.FirstAsync(g => g.PollId == poll.Id && g.Id == nextAncestorId.Value);

                if (ancestor == null)
                    break;

                if (ancestor.Id == request.Id)
                {
                    return BadRequest("Cannot make make ActivityGroup its own ancestor.");
                }

                nextAncestorId = ancestor.ParentId;
            }

            // User tracking.
            await UserEventsService.RecordEvent(new UserEvent
            {
                Account = Account,
                Category = "activity_group",
                Name = "move"
            });

            // Perform the move.
            if (request.TargetParentId == null && string.IsNullOrEmpty(request.TargetParentMatchResponseText))
            {
                // Move to the top level.
                activityGroup.ParentId = null;
            }
            else if (request.TargetParentId != null)
            {
                // Move it under the parent.
                activityGroup.ParentId = request.TargetParentId;
            }
            else if (!string.IsNullOrEmpty(request.TargetParentMatchResponseText))
            {
                // Create the target parent.
                var parent = new ActivityGroup
                {
                    Id = Guid.NewGuid(),
                    Name = request.TargetParentMatchResponseText,
                    MatchResponseText = request.TargetParentMatchResponseText,
                    PollId = poll.Id,
                    Position = 0
                };

                if (request.TargetGrandparentId != null)
                {
                    parent.ParentId = request.TargetGrandparentId;
                }

                Db.ActivityGroups.Add(parent);
                activityGroup.ParentId = parent.Id;
            }
            else
            {
                // We should not enter here.
                throw new Exception("Reached unreacheable code in " + nameof(ActivityGroupsController) + ".Move().");
            }

            await Db.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            // Validate that the user is logged in.
            var account = await GetCurrentAccountAsync();

            if (account == null)
            {
                return Unauthorized();
            }

            // Check if the ActivityGroup exists.
            var activityGroup = await Db.ActivityGroups.FirstOrDefaultAsync(a => a.Id == id);

            if (activityGroup == null)
                return NotFound();

            // Check if it belongs to the user.
            var pollRequest = Db.Polls.FirstOrDefaultAsync(p => p.Id == activityGroup.PollId);
            var poll = await pollRequest;

            if (poll.AccountId != account.Id)
            {
                return NotFound();
            }

            // User tracking.
            await UserEventsService.RecordEvent(new UserEvent
            {
                Account = Account,
                Category = "activity_group",
                Name = "delete"
            });

            // Unlink the children.
            var children = await Db.ActivityGroups.Where(a => a.PollId == poll.Id && a.ParentId == activityGroup.Id).ToListAsync();
            foreach (var child in children)
            {
                child.ParentId = null;
            }

            await Db.SaveChangesAsync();

            // Delete the group.
            Db.ActivityGroups.Remove(activityGroup);
            await Db.SaveChangesAsync();

            return NoContent();
        }

        //=================== Private ======================
        private IActionResult ValidateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return BadRequest("Must provide property 'name'");
            }

            if (name.Length > ActivityGroup.MaxNameLength)
            {
                return BadRequest("Length of 'name' property cannot be more than 300 characters.");
            }

            return null;
        }

        private IActionResult ValidateParentDescription(
            Guid? parentId, string parentMatchResponseText, Guid? grandparentId, string targetType)
        {
            if (!string.IsNullOrWhiteSpace(parentMatchResponseText) && parentId != null)
            {
                return BadRequest($"Cannot provide both '{targetType}MatchResponseText' and '{targetType}Id'.");
            }

            var lengthError = ValidateLength(parentMatchResponseText, ActivityGroup.MaxMatchResponseTextLength, targetType + "MatchResponseText");
            if (lengthError != null)
                return lengthError;

            if (string.IsNullOrWhiteSpace(parentMatchResponseText) && grandparentId != null)
            {
                return BadRequest($"Must provide '{targetType}MatchResponseText' when providing 'grandparentId'");
            }

            return null;
        }

        private IActionResult ValidateLength(string str, int maxLength, string propertyName)
        {
            if (!string.IsNullOrWhiteSpace(str) && str.Length > maxLength)
            {
                return BadRequest($"'{propertyName}' cannot be over {maxLength} characters.");
            }

            return null;
        }

        private async Task<IActionResult> ValidateGroupExists(Poll poll, Guid? id, 
            string matchResponseText, Guid? grandparentId, string targetType)
        {
            var targetText = string.IsNullOrEmpty(targetType) ? "" : " " + targetType;

            if (id != null)
            {
                var group = await Db.ActivityGroups.FirstOrDefaultAsync(g => g.PollId == poll.Id
                                                                             && g.Id == id.Value);

                if (group == null)
                {
                    return NotFound($"Could not find{targetText} ActivityGroup with id = '{id.Value}'");
                }
            }

            if (grandparentId != null)
            {
                var grandparentGroup = await Db.ActivityGroups.FirstOrDefaultAsync(g => g.PollId == poll.Id
                                                                                        && g.Id == grandparentId.Value);

                if (grandparentGroup == null)
                {
                    return NotFound($"Could not find grandparent ActivityGroup with id = '{grandparentId.Value}'");
                }
            }

            if (!string.IsNullOrWhiteSpace(matchResponseText))
            {
                var existingGroup = await Db.ActivityGroups.FirstOrDefaultAsync(g => g.PollId == poll.Id
                                                                            && g.MatchResponseText == matchResponseText);

                if (existingGroup != null)
                {
                    return BadRequest($"There is already a{targetText} group with matchResponseText = " +
                        $"'{matchResponseText}'. Please reference it by its id.");
                }
            }

            return null;
        }
    }
}
