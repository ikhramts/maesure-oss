using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Db;
using Server.Tests.Controllers.Common;
using System;
using System.Collections.Generic;
using System.Text;
using Xunit;

namespace Server.Tests.Controllers.ActivityGroupsControllerTests
{
    public class DeleteTests : AppControllerTestsBase
    {
        ActivityGroupsController _controller;

        public DeleteTests()
        {
            _controller = new ActivityGroupsController(Db, UserEventsService);
            SetUpLoggedInUser(_controller);
        }

        [Fact]
        public async void If_ActivityGroup_does_not_exist_return_NotFound()
        {
            var activityGroupId = Guid.NewGuid();
            var result = await _controller.Delete(activityGroupId);
            result.Should().BeOfType<NotFoundResult>();
        }

        [Fact]
        public async void If_ActivityGroup_exists_in_a_different_account_return_NotFound()
        {
            // Set up.
            var otherAccount = new Account
            {
                Id = Guid.NewGuid()
            };

            Db.Mock.Accounts.QueryData.Add(otherAccount);

            var otherPoll = new Poll
            {
                Id = Guid.NewGuid(),
                AccountId = otherAccount.Id
            };

            Db.Mock.Polls.QueryData.Add(otherPoll);

            var activityGroup = InsertActivityGroup("group");
            activityGroup.PollId = otherPoll.Id;

            // Act.
            var result = await _controller.Delete(activityGroup.Id);

            // Assert.
            result.Should().BeOfType<NotFoundResult>();
            Db.Mock.ActivityGroups.Removed.Should().BeEmpty();
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Fact]
        public async void If_ActivityGroup_exists_should_delete_it()
        {
            // Set up.
            var activityGroup = InsertActivityGroup("group");

            // Act.
            var result = await _controller.Delete(activityGroup.Id);

            // Assert.
            result.Should().BeOfType<NoContentResult>();
            Db.Mock.ActivityGroups.Removed.Should().Contain(a => a.Id == activityGroup.Id);
            Db.WasSaveChangesCalled.Should().Be(true);
        }

        [Fact]
        public async void If_ActivityGroup_has_children_should_unlink_children()
        {
            // Set up.
            var activityGroup = InsertActivityGroup("group");
            var child1 = InsertActivityGroup("child1", parentId: activityGroup.Id);
            var child2 = InsertActivityGroup("child2", parentId: activityGroup.Id);

            // Act.
            var result = await _controller.Delete(activityGroup.Id);

            // Assert.
            child1.ParentId.Should().BeNull();
            child2.ParentId.Should().BeNull();
        }
    }
}
