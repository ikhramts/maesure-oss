using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Db;
using Server.Tests.Controllers.Common;
using Server.Tests.Mocks;
using System;
using System.Collections.Generic;
using Xunit;

namespace Server.Tests.Controllers.PollsControllerTests
{
    public class UpdateTests : AppControllerTestsBase
    {
        PollsController _controller;

        public UpdateTests()
        {
            _controller = new PollsController(Db, MockLogger.Get<PollsController>(), UserEventsService);
            SetUpLoggedInUser(_controller);
        }

        [Theory]
        [InlineData("ActiveFrom")]
        [InlineData("ActiveTo")]
        public async void If_TimeSpan_field_is_provided_should_update_it(string propertyName)
        {
            // Set up.
            // First, make sure we won't cause any conflicts.
            DefaultPoll.ActiveFrom = TimeSpan.FromHours(0);
            DefaultPoll.ActiveTo = TimeSpan.FromHours(23);

            // Set up the right properties to test.
            var property = typeof(Poll).GetProperty(propertyName);
            property.SetValue(DefaultPoll, TimeSpan.FromHours(1));

            var requestProperty = typeof(Messages.PollUpdateRequest).GetProperty(propertyName);
            var request = new Messages.PollUpdateRequest();
            requestProperty.SetValue(request, TimeSpan.FromHours(2));

            // Act
            var reply = await _controller.Update(request);

            // Assert
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().BeTrue();
            var value = (TimeSpan)property.GetValue(DefaultPoll);
            value.Should().Be(TimeSpan.FromHours(2));
        }

        [Fact]
        public async void If_DesiredFrequencyMin_is_provided_should_update_it()
        {
            // Set up.
            DefaultPoll.DesiredFrequency = TimeSpan.FromMinutes(5);
            var request = new Messages.PollUpdateRequest
            {
                DesiredFrequencyMin = 6
            };

            // Act.
            var reply = await _controller.Update(request);

            // Assert.
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().BeTrue();
            DefaultPoll.DesiredFrequency.Should().Be(TimeSpan.FromMinutes(6));
        }

        [Theory]
        [InlineData("ActiveFrom")]
        [InlineData("ActiveTo")]
        public async void If_TimeSpan_field_is_not_provided_should_not_update_it(string propertyName)
        {
            // Set up.
            // Set up the right properties to test.
            var property = typeof(Poll).GetProperty(propertyName);
            property.SetValue(DefaultPoll, TimeSpan.FromHours(1));

            var request = new Messages.PollUpdateRequest
            {
                DesiredFrequencyMin = 5
            };

            // Act
            var reply = await _controller.Update(request);

            // Assert
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().BeTrue();
            var value = (TimeSpan)property.GetValue(DefaultPoll);
            value.Should().Be(TimeSpan.FromHours(1));
        }

        [Fact]
        public async void If_DesiredFrequencyMin_is_not_provided_should_not_update_it()
        {
            // Set up.
            DefaultPoll.DesiredFrequency = TimeSpan.FromMinutes(5);
            DefaultPoll.ActiveTo = TimeSpan.FromHours(23);
            var request = new Messages.PollUpdateRequest
            {
                ActiveFrom = TimeSpan.FromMinutes(1)
            };

            // Act.
            var reply = await _controller.Update(request);

            // Assert.
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().BeTrue();
            DefaultPoll.DesiredFrequency.Should().Be(TimeSpan.FromMinutes(5));

        }


        [Theory]
        [InlineData("10:00:00", "9:00:00")]
        [InlineData("12:00:00", null)]
        [InlineData(null, "7:00:00")]
        public async void Should_not_allow_activeFrom_to_be_after_activeTo(string activeFrom, string activeTo)
        {
            // Set up.
            DefaultPoll.ActiveFrom = TimeSpan.FromHours(8);
            DefaultPoll.ActiveTo = TimeSpan.FromHours(11);

            TimeSpan? activeFromTime = null;
            TimeSpan? activeToTime = null;

            if (activeFrom != null)
            {
                activeFromTime = TimeSpan.Parse(activeFrom);
            }

            if (activeTo != null)
            {
                activeToTime = TimeSpan.Parse(activeTo);
            }

            var request = new Messages.PollUpdateRequest
            {
                ActiveFrom = activeFromTime,
                ActiveTo = activeToTime,
            };

            // Act.
            var result = await _controller.Update(request);

            // Assert.
            result.Should().BeOfType<BadRequestObjectResult>();
            ((string)((BadRequestObjectResult)result).Value).Should().Contain("'activeFrom'");
            ((string)((BadRequestObjectResult)result).Value).Should().Contain("'activeTo'");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("-10:00:00")]
        [InlineData("25:00:00")]
        [InlineData("2.02:00:00")]
        public async void Require_activeFrom_to_be_between_0_and_24_hrs(string strValue)
        {
            // Set up.
            var activeFrom = TimeSpan.Parse(strValue);

            var request = new Messages.PollUpdateRequest
            {
                ActiveFrom = activeFrom,
            };

            // Act.
            var result = await _controller.Update(request);

            // Assert.
            result.Should().BeOfType<BadRequestObjectResult>();
            ((string)((BadRequestObjectResult)result).Value).Should().Contain("'activeFrom'");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData("-10:00:00")]
        [InlineData("25:00:00")]
        [InlineData("2.02:00:00")]
        public async void Require_activeTo_to_be_between_0_and_24_hrs(string strValue)
        {
            // Set up.
            var activeTo = TimeSpan.Parse(strValue);

            var request = new Messages.PollUpdateRequest
            {
                ActiveTo = activeTo,
            };

            // Act.
            var result = await _controller.Update(request);

            // Assert.
            result.Should().BeOfType<BadRequestObjectResult>();
            ((string)((BadRequestObjectResult)result).Value).Should().Contain("'activeTo'");
            Db.WasSaveChangesCalled.Should().Be(false);
        }

        [Theory]
        [InlineData(-5)]
        [InlineData(0)]
        [InlineData(Poll.MaxDesiredFrequencyMin + 1)]
        public async void Require_desiredFrequency_to_be_between_0_and_1_hr(int desiredFrequency)
        {
            // Set up.
            var request = new Messages.PollUpdateRequest
            {
                DesiredFrequencyMin = desiredFrequency,
            };

            // Act.
            var result = await _controller.Update(request);

            // Assert.
            result.Should().BeOfType<BadRequestObjectResult>();
            ((string)((BadRequestObjectResult)result).Value).Should().Contain("'desiredFrequencyMin'");
            ((string)((BadRequestObjectResult)result).Value).Should().Contain("" + Poll.MaxDesiredFrequencyMin);
        }

        [Fact]
        public async void If_wasStarted_is_false_should_set_it_to_false_and_set_startedAt_to_null()
        {
            // Set up.
            DefaultPoll.WasStarted = true;
            DefaultPoll.StartedAt = new DateTime(2019, 5, 3, 6, 2, 4);

            var request = new Messages.PollUpdateRequest
            {
                WasStarted = false,
            };

            // Act.
            var reply = await _controller.Update(request);

            // Assert.
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().BeTrue();
            DefaultPoll.WasStarted.Should().Be(false);
            DefaultPoll.StartedAt.Should().BeNull();

        }

        [Fact]
        public async void If_wasSarted_is_true_should_require_startedAt()
        {
            var request = new Messages.PollUpdateRequest
            {
                WasStarted = true,
            };

            // Act.
            var reply = await _controller.Update(request);

            // Assert.
            reply.Should().BeOfType<BadRequestObjectResult>();
            Db.WasSaveChangesCalled.Should().BeFalse();
            ((string)((BadRequestObjectResult)reply).Value).Should().Contain("'startedAt'");

        }

        [Fact]
        public async void If_wasStarted_is_true_and_startedAt_is_provided_should_save_them()
        {
            var request = new Messages.PollUpdateRequest
            {
                WasStarted = true,
                StartedAt = new DateTime(2019, 5, 3, 6, 2, 4)
            };

            // Act.
            var reply = await _controller.Update(request);


            // Assert.
            reply.Should().BeOfType<NoContentResult>();
            Db.WasSaveChangesCalled.Should().BeTrue();
            DefaultPoll.WasStarted.Should().Be(true);
            DefaultPoll.StartedAt.Should().Be(request.StartedAt);
        }
    }
}
