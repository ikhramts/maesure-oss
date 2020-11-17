using FluentAssertions;
using Messages;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.TimeLog;
using Server.Services.UserEvents;
using Server.Tests.Controllers.Common;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Services.TimeLog.TimeLogServiceTests
{
    public class UpdateGeneralTests : AppControllerTestsBase
    {
        private TimeLogService _service;
        private readonly DateTime TestFromTime = new DateTime(2019, 2, 3, 15, 16, 0);
        private readonly DateTime TestUtcNow = DateTime.SpecifyKind(new DateTime(2019, 2, 4, 17, 22, 34), DateTimeKind.Utc);
        private Poll _poll;

        public UpdateGeneralTests()
        {
            TimeService.UtcNow = TestUtcNow;
            _poll = DefaultPoll;
            _service = new TimeLogService(TimeService, new NullUserEventsService());
        }

        [Fact]
        public void Must_have_additions_or_deletions()
        {
            // Set up
            var req = new TimeLogUpdateRequest();

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, req);

            // Assert
            action.Should()
                .Throw<BadRequestException>()
                .WithMessage("*deletion*")
                .WithMessage("*addition*");
        }

        [Fact]
        public void Should_not_save_additions_if_there_are_errors_with_deletions()
        {
            // Set up.
            // Invalid deletion but a valid addition.
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange {FromTime = TestFromTime, ToTime = TestFromTime - TimeSpan.FromHours(1)},
                },
                Additions = new List<PollResponseAddRequest>
                {
                    new PollResponseAddRequest
                    {
                        TimeCollected = TestFromTime,
                        TimeBlockLength = TimeSpan.FromHours(1),
                        ResponseText = "DEF",
                        TimeZone = "ABC",
                        TimeZoneOffset = TimeSpan.FromHours(-2)
                    }
                }
            };

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, req);

            // Assert.
            action.Should().Throw<BadRequestException>(); // This is for a sanity check.
            Db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Fact]
        public void Should_not_save_deletions_if_there_are_errors_with_additions()
        {
            // Set up.
            // Valid deletion but an invalid addition.
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange {FromTime = TestFromTime, ToTime = TestFromTime + TimeSpan.FromHours(1)},
                },
                Additions = new List<PollResponseAddRequest>
                {
                    new PollResponseAddRequest
                    {
                        TimeCollected = TestFromTime,
                        TimeBlockLength = TimeSpan.FromHours(1),
                        ResponseText = "", // This should fail
                        TimeZone = "ABC",
                        TimeZoneOffset = TimeSpan.FromHours(-2)
                    }
                }
            };

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, req);

            // Assert.
            action.Should().Throw<BadRequestException>(); // This is for a sanity check.
            Db.WasSaveChangesCalled.Should().BeFalse();
        }
    }
}
