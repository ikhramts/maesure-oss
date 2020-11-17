using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Db;
using Server.Tests.Controllers.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Xunit;

namespace Server.Tests.Controllers.ActivityGroupsControllerTests
{
    public class MoveTests : AppControllerTestsBase
    {
        ActivityGroupsController _controller;

        public MoveTests()
        {
            _controller = new ActivityGroupsController(Db, UserEventsService);
            SetUpLoggedInUser(_controller);
        }

        // ============ Validation tests ===============
        [Fact]
        public async void If_Id_or_matchResponseText_are_missing_should_return_BadRequest()
        {
            // Set up
            var request = new Messages.ActivityGroupMoveRequest { };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("id");
            ((string)reply.Value).Should().Contain("matchResponseText");
            Db.WasSaveChangesCalled.Should().Be(false);

        }

        [Fact]
        public async void If_both_Id_and_matchResponseText_are_present_should_return_BadRequest()
        {
            // Set up
            var target = InsertActivityGroup("x", matchResponseText: "x");
            var request = new Messages.ActivityGroupMoveRequest
            {
                Id = target.Id,
                MatchResponseText = "X"
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("id");
            ((string)reply.Value).Should().Contain("matchResponseText");
            Db.WasSaveChangesCalled.Should().Be(false);

        }

        [Fact]
        public async void If_matchResponseText_is_too_long_should_return_BadRequest()
        {
            // Set up
            var request = new Messages.ActivityGroupMoveRequest
            {
                MatchResponseText = new string('a', ActivityGroup.MaxMatchResponseTextLength + 1)
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("matchResponseText");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Fact]
        public async void May_not_target_ActivityGroup_by_MatchResponseText_if_it_already_exists()
        {
            var group = InsertActivityGroup("Some group", matchResponseText: "Some group");
            var request = new Messages.ActivityGroupMoveRequest
            {
                MatchResponseText = "Some group"
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("target");
            ((string)reply.Value).Should().Contain("id");
            ((string)reply.Value).Should().Contain("matchResponseText");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Fact]
        public async void If_ActivityGroup_with_Id_does_not_exist_Should_return_NotFound()
        {
            // Set up
            var request = new Messages.ActivityGroupMoveRequest
            {
                Id = Guid.NewGuid()
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("id");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Fact]
        public async void If_ActivityGroup_with_Id_exists_but_is_not_in_current_account_should_return_NotFound()
        {
            // Set up
            var otherPoll = new Poll
            {
                AccountId = Guid.NewGuid(),
                Id = Guid.NewGuid()
            };
            Db.Mock.Polls.QueryData.Add(otherPoll);

            var group = InsertActivityGroup("x");
            group.PollId = otherPoll.Id;

            var request = new Messages.ActivityGroupMoveRequest
            {
                Id = group.Id
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            ((string)reply.Value).Should().NotBeNullOrWhiteSpace();
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_ActivityGroup_with_targetParentId_does_not_exist_Should_return_NotFound(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            request.TargetParentId = Guid.NewGuid();

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("parent");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_ActivityGroup_with_targetId_exists_but_is_in_different_poll_for_same_account_should_return_NotFound_with_descriptive_message(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            var parent = InsertActivityGroup("parent");
            parent.PollId = Guid.NewGuid();
            request.TargetParentId = parent.Id;

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("parent");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_both_targetId_and_targetMatchResponseText_are_provided_should_return_BadRequest(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            var parent = InsertActivityGroup("parent");
            request.TargetParentId = parent.Id;
            request.TargetParentMatchResponseText = "new parent";

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("targetParentId");
            ((string)reply.Value).Should().Contain("targetParentMatchResponseText");

            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_targetMatchResponseText_is_too_long_should_return_BadRequest(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            var parent = InsertActivityGroup("parent");
            request.TargetParentMatchResponseText = new string('a', ActivityGroup.MaxMatchResponseTextLength + 1);

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("targetParentMatchResponseText");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_ActivityGroup_with_targetMatchResponseText_already_exists_in_this_poll_should_return_BadRequest(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            var parent = InsertActivityGroup("Parent", matchResponseText: "Parent");
            request.TargetParentMatchResponseText = "Parent";

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("parent");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_targetGrandparentId_is_provided_without_targetMatchResponseText_should_return_BadRequest(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            var grandparent = InsertActivityGroup("Grandparent");
            request.TargetGrandparentId = grandparent.Id;

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("grandparentId");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_ActivityGroup_with_targetGrandParentId_does_not_exist_should_return_NotFound(string scenario)
        {
            // Set up
            var request = SetupScenario(scenario);
            request.TargetParentMatchResponseText = "Some text";
            request.TargetGrandparentId = Guid.NewGuid();

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("grandparent");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_ActivityGroup_with_targetGrandparentId_exists_but_is_in_another_poll_should_return_NotFound_with_descriptive_message(string scenario)
        {
            // Set up
            var grandparent = InsertActivityGroup("Grandparent");
            grandparent.PollId = Guid.NewGuid();

            var request = SetupScenario(scenario);
            request.TargetParentMatchResponseText = "Some text";
            request.TargetGrandparentId = grandparent.PollId;

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("grandparent");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById", true)]
        [InlineData("TargetById", false)]
        [InlineData("TargetByMatchResponseText", true)]
        [InlineData("TargetByMatchResponseText", false)]
        public async void If_targetParentId_is_provided_should_not_allow_to_provide_targetIsUncategorized(string scenario, bool targetIsUncategorized)
        {
            // Set up
            var parent = InsertActivityGroup("Grandparent");
            var request = SetupScenario(scenario);
            request.TargetParentId = parent.PollId;
            request.TargetIsUncategorized = targetIsUncategorized;

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("targetIsUncategorized");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("TargetById", true)]
        [InlineData("TargetById", false)]
        [InlineData("TargetByMatchResponseText", true)]
        [InlineData("TargetByMatchResponseText", false)]
        public async void If_targetMatchResponseText_is_provided_should_not_allow_to_provide_targetIsUncategorized(string scenario, bool targetIsUncategorized)
        {
            var request = SetupScenario(scenario);
            request.TargetParentMatchResponseText = "Parent";
            request.TargetIsUncategorized = targetIsUncategorized;

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().Contain("targetIsUncategorized");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Fact]
        public async void May_not_make_activity_its_own_parent_when_targeting_by_MatchResponseText()
        {
            var request = new Messages.ActivityGroupMoveRequest();
            request.TargetParentMatchResponseText = "Some group";
            request.MatchResponseText = "Some group";

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().NotBeNullOrWhiteSpace();
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Fact]
        public async void May_not_make_activity_its_own_ancestor_when_targeting_by_Id()
        {
            // Set up: try to make an activity a great-grandchild of itself.
            var grandparent = InsertActivityGroup("Grandparent");
            var parent = InsertActivityGroup("Parent", parentId: grandparent.Id);
            var child = InsertActivityGroup("Child", parentId: parent.Id);

            var request = new Messages.ActivityGroupMoveRequest();
            request.Id = grandparent.Id;
            request.TargetParentId = child.Id;

            // Act
            var rawReply = await _controller.Move(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            ((string)reply.Value).Should().NotBeNullOrWhiteSpace();
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        // ================== Implementation tests ====================
        [Fact]
        public async void If_target_has_Id_and_nothing_else_should_move_it_to_top_level()
        {
            // Set up.
            var parent = InsertActivityGroup("Parent");
            var child = InsertActivityGroup("Child", parentId: parent.Id);

            var request = new Messages.ActivityGroupMoveRequest {
                Id = child.Id
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert.
            rawReply.Should().BeOfType<NoContentResult>();
            child.ParentId.Should().BeNull();
            Db.WasSaveChangesCalled.Should().Be(true);
        }

        [Fact]
        public async void If_target_has_matchResponseText_and_nothing_else_should_create_ActivityGroup_at_top_level()
        {
            // Set up.
            var request = new Messages.ActivityGroupMoveRequest
            {
                MatchResponseText = "New group"
            };

            // Act
            var rawReply = await _controller.Move(request);

            // Assert.
            rawReply.Should().BeOfType<NoContentResult>();
            var newGroup = Db.Mock.ActivityGroups.Added.First(g => g.MatchResponseText == "New group");
            newGroup.Name.Should().Be("New group");
            newGroup.ParentId.Should().BeNull();
            newGroup.PollId.Should().Be(DefaultPollId);

            Db.WasSaveChangesCalled.Should().Be(true);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_targetParentId_is_provided_should_set_the_parentId_on_the_target_ActivityGroup(string scenario)
        {
            // Set up.
            var parent = InsertActivityGroup("Parent");
            var request = SetupScenario(scenario);
            request.TargetParentId = parent.Id;

            // Act.
            var rawReply = await _controller.Move(request);

            // Assert.
            rawReply.Should().BeOfType<NoContentResult>();
            var group = GetAffectedGroup(request);
            group.ParentId.Should().Be(parent.Id);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_targetParentMatchResponseText_is_provided_without_targetGrandparentId_should_create_target_parent(string scenario)
        {
            // Set up.
            var request = SetupScenario(scenario);
            request.TargetParentMatchResponseText = "Some text";

            // Act.
            var rawReply = await _controller.Move(request);

            // Assert.
            rawReply.Should().BeOfType<NoContentResult>();

            var newParent = Db.Mock.ActivityGroups.Added.First(g => g.MatchResponseText == "Some text");
            newParent.Name.Should().Be("Some text");
            newParent.ParentId.Should().BeNull();
            newParent.PollId.Should().Be(DefaultPollId);

            var group = GetAffectedGroup(request);
            group.ParentId.Should().Be(newParent.Id);
        }

        [Theory]
        [InlineData("TargetById")]
        [InlineData("TargetByMatchResponseText")]
        public async void If_targetParentMatchResponseText_is_provided_with_targetGrandparentId_should_crate_target_parent_under_target_grandparent(string scenario)
        {
            // Set up.
            var grandparent = InsertActivityGroup("Grandparent");
            var request = SetupScenario(scenario);
            request.TargetParentMatchResponseText = "Some text";
            request.TargetGrandparentId = grandparent.Id;

            // Act.
            var rawReply = await _controller.Move(request);

            // Assert.
            rawReply.Should().BeOfType<NoContentResult>();

            var newParent = Db.Mock.ActivityGroups.Added.First(g => g.MatchResponseText == "Some text");
            newParent.Name.Should().Be("Some text");
            newParent.ParentId.Should().Be(grandparent.Id);
            newParent.PollId.Should().Be(DefaultPollId);

            var group = GetAffectedGroup(request);
            group.ParentId.Should().Be(newParent.Id);
        }

        //======================= Private ===================================
        private void SetRequestProperty(Messages.ActivityGroupMoveRequest request, string what, string value)
        {
            if (what == "Id")
            {
                request.Id = new Guid(value);
            }
            else if (what == "MatchResponseText")
            {
                request.MatchResponseText = value;
            }
            else
            {
                throw new Exception($"Don't know how to set property '{what}'");
            }
        }

        private ActivityGroup GetAffectedGroup(Messages.ActivityGroupMoveRequest request)
        {
            ActivityGroup group;

            if (request.Id.HasValue)
            {
                group = Db.Mock.ActivityGroups.QueryData.First(g => g.Id == request.Id);
            }
            else
            {
                group = Db.Mock.ActivityGroups.Added.First(g => g.MatchResponseText == request.MatchResponseText);
            }

            return group;
        }

        private Messages.ActivityGroupMoveRequest SetupTargetWithId()
        {
            var group = InsertActivityGroup("target");
            return new Messages.ActivityGroupMoveRequest {
                Id = group.Id
            };
        }

        private Messages.ActivityGroupMoveRequest SetupTargetWithMatchResponseText()
        {
            return new Messages.ActivityGroupMoveRequest
            {
                MatchResponseText = "some text"
            };
        }

        private Messages.ActivityGroupMoveRequest SetupScenario(string scenario)
        {
            if (scenario == "TargetById")
            {
                return SetupTargetWithId();
            } 
            else if (scenario == "TargetByMatchResponseText")
            {
                return SetupTargetWithMatchResponseText();
            }

            throw new Exception($"Don't know how to set up scenario '{scenario}'");
        }
    }
}
