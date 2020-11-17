using FluentAssertions;
using Messages;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.TimeLog;
using Server.Services.UserEvents;
using Server.Tests.Controllers.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Services.TimeLog.TimeLogServiceTests
{
    public class UpdateAdditionsTests : AppControllerTestsBase
    {
        private TimeLogService _service;
        private readonly DateTime TestFromTime = new DateTime(2019, 2, 3, 15, 16, 0);
        private readonly TimeSpan TestBlockLength = TimeSpan.FromMinutes(10);
        private readonly DateTime TestUtcNow = DateTime.SpecifyKind(new DateTime(2019, 2, 4, 17, 22, 34), DateTimeKind.Utc);
        private Poll _poll;

        public UpdateAdditionsTests()
        {
            TimeService.UtcNow = TestUtcNow;
            _poll = DefaultPoll;
            _service = new TimeLogService(TimeService, new NullUserEventsService());
        }

        [Fact]
        public async void Should_insert_entry()
        {
            // Set up
            var msg = MakeUpdateRequest("1");

            // Act
            await _service.Update(Db, _poll.Id, msg);

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();
            var addedEntries = Db.Mock.TimeLogEntries.Added;
            addedEntries.Should().HaveCount(1);
            addedEntries.Should().Contain(e => e.EntryText == "1");
        }

        [Fact]
        public async void Should_set_all_message_fields_in_DB()
        {
            var msg = new PollResponseAddRequest
            {
                ResponseText = "1",
                TimeBlockLength = TimeSpan.FromMinutes(10),
                TimeCollected = TestFromTime,
                TimeZone = "ABC",
                TimeZoneOffset = TimeSpan.FromHours(-2),
                SubmissionType = "something"
            };

            // Act
            await _service.Update(Db, _poll.Id, new TimeLogUpdateRequest { Additions = new List<PollResponseAddRequest> { msg } });

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();

            var addedEntries = Db.Mock.TimeLogEntries.Added;
            var entry = addedEntries.First(e => e.EntryText == "1");
            entry.Id.Should().NotBe(default);
            entry.FromTime.Should().Be(msg.TimeCollected);
            entry.TimeZone.Should().Be(msg.TimeZone);
            entry.TimeZoneOffset.Should().Be(msg.TimeZoneOffset);
            entry.SubmissionType.Should().Be(msg.SubmissionType);
        }

        [Fact]
        public async void Should_set_ToTime()
        {
            // Set up
            var msg = MakeUpdateRequest("1", TestFromTime, TestBlockLength);

            // Act
            await _service.Update(Db, _poll.Id, msg);

            // Assert
            var addedEntries = Db.Mock.TimeLogEntries.Added;
            var entry = addedEntries.First(e => e.EntryText == "1");
            entry.ToTime.Should().Be(TestFromTime + TestBlockLength);
        }

        [Fact]
        public async void Should_set_CreatedTimeUtc()
        {
            // Set up
            var msg = MakeUpdateRequest("1");

            // Act
            await _service.Update(Db, _poll.Id, msg);

            // Assert
            var addedEntry = Db.Mock.TimeLogEntries.Added.First();
            addedEntry.CreatedTimeUtc.Should().Be(TestUtcNow);
        }

        [Fact]
        public async void If_there_are_multiple_entries_then_should_save_all()
        {
            // Set up
            var msg = MakeUpdateRequest("1");
            msg.Additions.Add(GetAddMsg("2"));

            // Act
            await _service.Update(Db, _poll.Id, msg);

            // Assert
            var addedEntries = Db.Mock.TimeLogEntries.Added;
            addedEntries.Should().HaveCount(2);

            addedEntries.Should().Contain(e => e.EntryText == "1");
            addedEntries.Should().Contain(e => e.EntryText == "2");
        }

        [Fact]
        public void If_timeZone_length_is_longer_than_allowed_should_throw()
        {
            // Set up
            var msg = MakeUpdateRequest("abc");
            msg.Additions[0].TimeZone = new string('a', TimeLogEntry.MaxEntryTextLength + 1);

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, msg);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*timeZone*")
                .WithMessage($"*{TimeLogEntry.MaxTimeZoneLength}*");

            Db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Fact]
        public void If_one_of_the_entries_fails_validation_should_throw_and_not_save_any()
        {
            // Set up. 
            var msg = MakeUpdateRequest("1");
            msg.Additions.Add(GetAddMsg(" "));
            msg.Additions.Add(GetAddMsg("3"));

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, msg);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*2*");

            Db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Fact]
        public void If_EntryText_is_longer_than_allowed_should_throw()
        {
            // Set up
            var msg = MakeUpdateRequest(new string('a', TimeLogEntry.MaxTimeZoneLength + 1));

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, msg);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*entryText*")
                .WithMessage($"*{TimeLogEntry.MaxEntryTextLength}*");

            Db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("  ")]
        [InlineData("\t")]
        [InlineData("\r\n")]
        public void If_EntryText_is_null_or_whitespace_should_throw(string entryText)
        {
            // Set up
            var msg = MakeUpdateRequest(entryText);

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, msg);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*entryText*");

            Db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void If_TimeBlockLength_is_not_positive_should_throw(double minutes)
        {
            // Set up
            var msg = MakeUpdateRequest("1");
            msg.Additions[0].TimeBlockLength = TimeSpan.FromMinutes(minutes);

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, msg);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*timeBlockLength*");

            Db.WasSaveChangesCalled.Should().BeFalse();

        }

        [Fact]
        public void If_TimeBlockLength_is_longer_than_allowed_should_throw()
        {
            // Set up
            var msg = MakeUpdateRequest("1");
            msg.Additions[0].TimeBlockLength = TimeLogService.MaxAllowedTimeBlockLength + TimeSpan.FromSeconds(1);

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, msg);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*timeBlockLength*");

            Db.WasSaveChangesCalled.Should().BeFalse();

        }

        [Theory]
        [InlineData("2019-11-12 10:11:12", "2019-11-12 10:11:00")] // Round down
        [InlineData("2019-11-12 10:11:58", "2019-11-12 10:11:00")] // Still round down
        [InlineData("2019-11-12 10:11:12.345", "2019-11-12 10:11:00")] // Round down milliseconds too
        public async void Should_force_fromTime_to_align_to_start_of_minute(string msgTime, string savedTime)
        {
            // Set up
            var msg = MakeUpdateRequest("1");
            msg.Additions[0].TimeCollected = DateTime.Parse(msgTime);

            // Act
            await _service.Update(Db, _poll.Id, msg);

            // Assert
            var expectedTime = DateTime.Parse(savedTime);
            var addedEntry = Db.Mock.TimeLogEntries.Added.First();
            addedEntry.FromTime.Should().Be(expectedTime);

        }

        // =========================== Private ==========================
        private PollResponseAddRequest GetAddMsg(string entryText, DateTime fromTime = default, TimeSpan timeBlockLength = default)
        {
            var usedFromTime = fromTime;

            if (usedFromTime == default)
            {
                usedFromTime = TestFromTime;
            }

            var usedTimeBlockLength = timeBlockLength;

            if (usedTimeBlockLength == default)
            {
                usedTimeBlockLength = TestBlockLength;
            }

            return new PollResponseAddRequest
            {
                TimeCollected = usedFromTime,
                TimeBlockLength = usedTimeBlockLength,
                ResponseText = entryText,
                TimeZone = "ABC",
                TimeZoneOffset = TimeSpan.FromHours(-2)
            };
        }

        private TimeLogUpdateRequest MakeUpdateRequest(string entryText, DateTime fromTime = default, TimeSpan timeBlockLength = default)
        {
            return new TimeLogUpdateRequest
            {
                Additions = new List<PollResponseAddRequest> { GetAddMsg(entryText, fromTime, timeBlockLength) }
            };
        }
    }
}
