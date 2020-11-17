using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Db;
using Server.Tests.Controllers.Common;
using System;
using System.Linq;
using Xunit;

namespace Server.Tests.Controllers
{
    public class CreateTests : AppControllerTestsBase
    {
        ActivityGroupsController _controller;

        public CreateTests()
        {
            _controller = new ActivityGroupsController(Db, UserEventsService);
            SetUpLoggedInUser(_controller);
        }

        [Fact]
        public async void If_name_is_missing_should_return_bad_request()
        {
            var request = new Messages.ActivityGroupCreateRequest();
            var rawReply = await _controller.Create(request);

            var reply = (BadRequestObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("name");
        }

        [Fact]
        public async void If_parentId_and_parentMatchText_are_both_present_should_return_bad_request()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest
            {
                Name = "Thing",
                ParentId = Guid.NewGuid(),
                ParentMatchResponseText = "SomeText"
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("parentId");
            message.Should().Contain("parentMatchResponseText");
        }

        [Fact]
        public async void If_ActivityGroup_with_parentId_does_not_exist_should_return_NotFound()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                ParentId = Guid.NewGuid()
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("parent");
        }

        [Fact]
        public async void If_ActivityGroup_with_parentMatchResponseText_exists_should_return_bad_request()
        {
            // Set up
            InsertActivityGroup("Parent", matchResponseText: "Some text");

            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                ParentMatchResponseText = "Some text"
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("matchResponseText");
            message.Should().Contain("parent");
        }

        [Fact]
        public async void If_ActivityGroup_with_grandparentId_does_not_exist_should_return_NotFound()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                ParentMatchResponseText = "Some text",
                GrandparentId = Guid.NewGuid()
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (NotFoundObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("grandparent");
        }

        [Fact]
        public async void If_grandparentId_is_provided_without_parentMatchResponseText_should_return_BadRequest()
        {
            // Set up
            var grapdparent = InsertActivityGroup("Grandparent");

            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                GrandparentId = Guid.NewGuid()
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("parentMatchResponseText");
            message.Should().Contain("grandparentId");
        }

        [Fact]
        public async void If_name_is_too_long_should_return_bad_request()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = new string('a', ActivityGroup.MaxNameLength + 1),
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("name");
        }

        [Fact]
        public async void If_parentMatchResponseText_is_too_long_should_return_bad_request()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                ParentMatchResponseText = new string('a', ActivityGroup.MaxMatchResponseTextLength + 1),
            };

            // Act
            var rawReply = await _controller.Create(request);

            // Assert
            var reply = (BadRequestObjectResult)rawReply;
            var message = (string)reply.Value;
            message.Should().Contain("parentMatchResponseText");
        }

        [Fact]
        public async void Should_set_pollId_to_default_poll_Id()
        {
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                ParentMatchResponseText = "Parent"
            };

            // Act
            var reply = await _controller.Create(request);

            // Assert
            var thingActivityGroup = Db.Mock.ActivityGroups.Added.First(a => a.Name == "Thing");
            var parentActivityGroup = Db.Mock.ActivityGroups.Added.First(a => a.Name == "Parent");

            thingActivityGroup.PollId.Should().Be(DefaultPollId);
            parentActivityGroup.PollId.Should().Be(DefaultPollId);
        }

        [Fact]
        public async void If_only_name_is_present_should_create_top_level_ActivityGroup()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
            };

            // Act
            var reply = await _controller.Create(request);

            // Assert
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().Be(true);
            Db.Mock.ActivityGroups.Added.Should().HaveCount(1);
            var activityGroup = Db.Mock.ActivityGroups.Added.First();

            activityGroup.Name.Should().Be("Thing");
            activityGroup.ParentId.Should().BeNull();
            activityGroup.MatchResponseText.Should().BeNull();
        }

        [Fact]
        public async void If_name_and_parent_are_present_should_create_activity_group_under_the_parent()
        {
            // Set up
            var parent = InsertActivityGroup("Parent");
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Thing",
                ParentId = parent.Id,
            };

            // Act
            var reply = await _controller.Create(request);

            // Assert
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().Be(true);
            Db.Mock.ActivityGroups.Added.Should().HaveCount(1);
            var activityGroup = Db.Mock.ActivityGroups.Added.First();

            activityGroup.Name.Should().Be("Thing");
            activityGroup.ParentId.Should().Be(parent.Id);
            activityGroup.MatchResponseText.Should().BeNull();
        }

        [Fact]
        public async void If_name_and_parentMatchResponseText_are_present_should_create_both_parent_and_this_group()
        {
            // Set up
            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Child",
                ParentMatchResponseText = "Parent"
            };

            // Act
            var reply = await _controller.Create(request);

            // Assert
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().Be(true);
            Db.Mock.ActivityGroups.Added.Should().HaveCount(2);
            var childActivityGroup = Db.Mock.ActivityGroups.Added.First(a => a.Name == "Child");
            var parentActivityGroup = Db.Mock.ActivityGroups.Added.First(a => a.Name == "Parent");

            childActivityGroup.ParentId.Should().Be(parentActivityGroup.Id);
            childActivityGroup.MatchResponseText.Should().BeNull();

            parentActivityGroup.ParentId.Should().BeNull();
            parentActivityGroup.MatchResponseText.Should().Be("Parent");
        }

        [Fact]
        public async void If_name_and_parentMatchResponseText_and_grandparentId_are_present_should_create_parent_and_this_group_under_the_grandparent()
        {
            // Set up
            var grandparent = InsertActivityGroup("Grandparent");

            var request = new Messages.ActivityGroupCreateRequest()
            {
                Name = "Child",
                ParentMatchResponseText = "Parent",
                GrandparentId = grandparent.Id
            };

            // Act
            var reply = await _controller.Create(request);

            // Assert
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().Be(true);
            Db.Mock.ActivityGroups.Added.Should().HaveCount(2);
            var childActivityGroup = Db.Mock.ActivityGroups.Added.First(a => a.Name == "Child");
            var parentActivityGroup = Db.Mock.ActivityGroups.Added.First(a => a.Name == "Parent");

            childActivityGroup.ParentId.Should().Be(parentActivityGroup.Id);
            childActivityGroup.MatchResponseText.Should().BeNull();

            parentActivityGroup.ParentId.Should().Be(grandparent.Id);
            parentActivityGroup.MatchResponseText.Should().Be("Parent");

        }
        
    }
}
