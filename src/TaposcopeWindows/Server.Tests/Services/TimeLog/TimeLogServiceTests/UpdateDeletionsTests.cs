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
    public class UpdateDeletionsTests : AppControllerTestsBase
    {

        private TimeLogService _service;
        private readonly DateTime TestFromTime = new DateTime(2019, 2, 3, 15, 16, 0);
        private readonly DateTime TestUtcNow = DateTime.SpecifyKind(new DateTime(2019, 2, 4, 17, 22, 34), DateTimeKind.Utc);
        private Poll _poll;

        public UpdateDeletionsTests()
        {
            TimeService.UtcNow = TestUtcNow;
            _poll = DefaultPoll;
            _service = new TimeLogService(TimeService, new NullUserEventsService());
        }

        [Fact]
        public async void Should_insert_deletion_entry_for_every_range()
        {
            // Set up
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange {FromTime = TestFromTime, ToTime = TestFromTime + TimeSpan.FromHours(1)},
                    new TimeLogDeletedRange {FromTime = TestFromTime + TimeSpan.FromHours(2), ToTime = TestFromTime + TimeSpan.FromHours(3)},
                }
            };

            // Act
            await _service.Update(Db, _poll.Id, req);

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();

            var addedEntries = Db.Mock.TimeLogEntries.Added;
            addedEntries.Should().HaveCount(2);

            var entry0 = addedEntries[0];
            entry0.IsDeletion.Should().Be(true);
            entry0.FromTime.Should().Be(TestFromTime + TimeSpan.FromHours(2));
            entry0.ToTime.Should().Be(TestFromTime + TimeSpan.FromHours(3));
            entry0.EntryText.Should().Be("[deletion]");

            // Second entry
            var entry1 = addedEntries[1];
            entry1.IsDeletion.Should().Be(true);
            entry1.FromTime.Should().Be(TestFromTime);
            entry1.ToTime.Should().Be(TestFromTime + TimeSpan.FromHours(1));
            entry1.EntryText.Should().Be("[deletion]");
        }

        [Fact]
        public async void Should_set_CreatedTimeUtc_to_one_msec_ago()
        {
            // Set up
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange {FromTime = TestFromTime, ToTime = TestFromTime + TimeSpan.FromHours(1)},
                }
            };

            // Act
            await _service.Update(Db, _poll.Id, req);

            // Assert
            var expectedCreatedTimeUtc = TestUtcNow - TimeSpan.FromMilliseconds(1);

            var addedEntries = Db.Mock.TimeLogEntries.Added;
            var entry0 = addedEntries[0];
            entry0.CreatedTimeUtc.Should().Be(expectedCreatedTimeUtc);
        }

        [Fact]
        public async void Should_combine_ajacent_deleted_ranges_into_a_single_entry()
        {
            // Set up
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange {FromTime = TestFromTime + TimeSpan.FromHours(1), ToTime = TestFromTime + TimeSpan.FromHours(2)},
                    new TimeLogDeletedRange {FromTime = TestFromTime, ToTime = TestFromTime + TimeSpan.FromHours(1)},
                }
            };

            // Act
            await _service.Update(Db, _poll.Id, req);

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();

            var addedEntries = Db.Mock.TimeLogEntries.Added;
            addedEntries.Should().HaveCount(1);

            // First entry
            var entry0 = addedEntries[0];
            entry0.FromTime.Should().Be(TestFromTime);
            entry0.ToTime.Should().Be(TestFromTime + TimeSpan.FromHours(2));
        }

        [Fact]
        public async void Should_combine_overlapping_ranges_into_a_single_entry()
        {
            // Set up
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange {FromTime = TestFromTime + TimeSpan.FromHours(1), ToTime = TestFromTime + TimeSpan.FromHours(2)},
                    new TimeLogDeletedRange {FromTime = TestFromTime, ToTime = TestFromTime + TimeSpan.FromHours(1.5)},
                }
            };

            // Act
            await _service.Update(Db, _poll.Id, req);

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();

            var addedEntries = Db.Mock.TimeLogEntries.Added;
            addedEntries.Should().HaveCount(1);

            // First entry
            var entry0 = addedEntries[0];
            entry0.FromTime.Should().Be(TestFromTime);
            entry0.ToTime.Should().Be(TestFromTime + TimeSpan.FromHours(2));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void If_from_time_is_on_or_before_to_time_should_throw_and_not_save_any_deletions(int hoursLength)
        {
            // Set up
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange
                    {
                        FromTime = TestFromTime,
                        ToTime = TestFromTime + TimeSpan.FromHours(1)
                    },
                    new TimeLogDeletedRange
                    {
                        FromTime = TestFromTime + TimeSpan.FromHours(3),
                        ToTime = TestFromTime + TimeSpan.FromHours(3 + hoursLength)
                    },
                }
            };

            // Act
            Func<Task> action = async () => await _service.Update(Db, _poll.Id, req);

            // Assert
            action.Should().Throw<BadRequestException>()
                .WithMessage("*fromTime*")
                .WithMessage("*toTime*");

            Db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Fact]
        public async void Truncate_from_and_to_times_to_preceding_minute()
        {
            // Set up
            var req = new TimeLogUpdateRequest
            {
                Deletions = new List<TimeLogDeletedRange>
                {
                    new TimeLogDeletedRange
                    {
                        FromTime = TestFromTime + TimeSpan.FromSeconds(5),
                        ToTime = TestFromTime + TimeSpan.FromHours(1) + TimeSpan.FromSeconds(59)
                    },
                }
            };

            // Act
            await _service.Update(Db, _poll.Id, req);

            // Assert
            Db.WasSaveChangesCalled.Should().BeTrue();

            var addedEntries = Db.Mock.TimeLogEntries.Added;

            // First entry
            var entry0 = addedEntries[0];
            entry0.FromTime.Should().Be(TestFromTime);
            entry0.ToTime.Should().Be(TestFromTime + TimeSpan.FromHours(1));
        }
    }
}
