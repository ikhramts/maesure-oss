using FluentAssertions;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.TimeLog;
using Server.Services.UserEvents;
using Server.Tests.Controllers.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Services.TimeLog.TimeLogServiceTests
{
    public class UndoTests : AppControllerTestsBase
    {
        private TimeLogService _service;
        private readonly DateTime TestFromTime = new DateTime(2019, 2, 3, 15, 16, 0);
        private readonly TimeSpan TestBlockLength = TimeSpan.FromMinutes(10);
        private readonly DateTime TestUtcNow = DateTime.SpecifyKind(new DateTime(2019, 2, 4, 17, 22, 34), DateTimeKind.Utc);

        public UndoTests()
        {
            TimeService.UtcNow = TestUtcNow;
            _service = new TimeLogService(TimeService, new NullUserEventsService());
        }

        [Fact]
        public void Cannot_undo_other_undo_entries()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", TestFromTime);
            entry.UndoTarget = Guid.NewGuid();

            // Act
            Func<Task> action = async () => await _service.Undo(Db, DefaultPollId, entry.Id);

            // Assert
            Db.WasSaveChangesCalled.Should().BeFalse();
            action.Should().Throw<BadRequestException>()
                .WithMessage("*undo*");
        }

        [Fact]
        public async void If_undoing_an_entry_should_duplicate_its_fields()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", TestFromTime);
            entry.ToTime = TestFromTime + TestBlockLength;

            // Act
            await _service.Undo(Db, DefaultPollId, entry.Id);

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();
            var addedEntries = Db.Mock.TimeLogEntries.Added;
            addedEntries.Should().HaveCount(1);

            var newEntry = addedEntries.First();
            newEntry.Id.Should().NotBe(entry.Id);
            newEntry.Id.Should().NotBe(default);
            newEntry.PollId.Should().Be(DefaultPollId);

            newEntry.FromTime.Should().Be(TestFromTime);
            newEntry.ToTime.Should().Be(TestFromTime + TestBlockLength);
            newEntry.EntryText.Should().Be("1");

            newEntry.TimeZone.Should().Be(entry.TimeZone);
            newEntry.TimeZoneOffset.Should().Be(entry.TimeZoneOffset);
        }

        [Fact]
        public async void Should_set_IsUndo_flag()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", TestFromTime);

            // Act
            await _service.Undo(Db, DefaultPollId, entry.Id);

            // Assert
            var addedEntries = Db.Mock.TimeLogEntries.Added;
            var newEntry = addedEntries.First();
            newEntry.UndoTarget.Should().Be(entry.Id);
        }

        [Fact]
        public async void Should_set_new_CreatedTimeUtc()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", TestFromTime);
            entry.CreatedTimeUtc = TestUtcNow.AddDays(-2).AddHours(3);

            // Act
            await _service.Undo(Db, DefaultPollId, entry.Id);

            // Assert
            var addedEntries = Db.Mock.TimeLogEntries.Added;
            var newEntry = addedEntries.First();
            newEntry.CreatedTimeUtc.Should().Be(TestUtcNow);
        }

        [Fact]
        public void If_entry_is_not_in_the_poll_should_return_not_found()
        {
            // Set up
            var anotherPollId = Guid.NewGuid();
            var entry = InsertTimeLogEntry("1", TestFromTime);
            entry.PollId = anotherPollId;

            // Act
            Func<Task> action = async () => await _service.Undo(Db, DefaultPollId, entry.Id);

            // Assert
            Db.WasSaveChangesCalled.Should().BeFalse();
            action.Should().Throw<NotFoundException>()
                .WithMessage($"*{entry.Id}*");
        }

        [Fact]
        public async void Should_return_undone_entry()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", TestFromTime);

            // Act
            var result = await _service.Undo(Db, DefaultPollId, entry.Id);

            // Assert
            result.Id.Should().Be(entry.Id);
            result.FromTime.Should().Be(entry.FromTime);
            result.TimeBlockLength.Should().Be(entry.GetTimeBlockLength());
            result.EntryText.Should().Be(entry.EntryText);
            result.CreatedTimeUtc.Should().Be(entry.CreatedTimeUtc);
        }
    }
}
