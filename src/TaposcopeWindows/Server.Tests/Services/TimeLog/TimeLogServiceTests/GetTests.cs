using FluentAssertions;
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
    public class GetTests : AppControllerTestsBase
    {
        private TimeLogService _service;
        private Poll _poll;

        private DateTime _fromTime = new DateTime(2019, 2, 4, 5, 0, 0);
        private DateTime _toTime = new DateTime(2019, 2, 6, 5, 0, 0);

        private readonly TimeSpan TestBlockLength = TimeSpan.FromMinutes(5);

        public GetTests()
        {
            _poll = DefaultPoll;
            _service = new TimeLogService(TimeService, new NullUserEventsService());
        }

        [Fact]
        public void If_to_date_is_before_from_date_should_return_BadRequest()
        {
            Func<Task> action = async () => await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(-3));
            action.Should()
                .Throw<BadRequestException>()
                .WithMessage("*toTime*")
                .WithMessage("*fromTime*");
        }

        [Fact]
        public void If_more_than_maximum_allowed_days_requested_should_return_BadRequest()
        {
            Func<Task> action = async () => await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddDays(TimeLogService.MaxAllowedRequestedDays + 1));
            action.Should()
                .Throw<BadRequestException>()
                .WithMessage("*more than*")
                .WithMessage($"*{TimeLogService.MaxAllowedRequestedDays}*");
        }

        [Theory]
        [InlineData(0)]      // In this case, toTime == fromTime.
        [InlineData(5)]
        public async void Should_return_all_entries_from_fromTime_in_poll_time_zone(double hoursOffset)
        {
            // Set up.
            // Time zone is assumed to be EST for now
            InsertTimeLogEntry("1", _fromTime.AddHours(hoursOffset));

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _toTime);

            // Assert.
            results.Should().HaveCount(1);
            results.Should().Contain(e => e.EntryText == "1");
        }

        [Theory]
        [InlineData(-0.01)]      // Right before the end of toTime
        [InlineData(-5)]
        public async void Should_return_all_entries_until_end_of_toTime_in_poll_time_zone(double hoursOffset)
        {
            // Set up.
            // Time zone is assumed to be EST for now
            InsertTimeLogEntry("1", _toTime.AddHours(hoursOffset));

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _toTime);

            // Assert.
            results.Should().HaveCount(1);
            results.Should().Contain(e => e.EntryText == "1");
        }

        [Theory]
        [InlineData(-30)]      // Way before the period
        [InlineData(-5)]     // Right before the the start of the period
        [InlineData(60)]        // Exact end of the period
        [InlineData(120)]       // Way past the period
        public async void Should_not_return_entries_oustide_the_selected_range(double minutesOffset)
        {
            // Set up.
            // Time zone is assumed to be EST for now
            var entry = InsertTimeLogEntry("1", _fromTime.AddHours(minutesOffset));
            entry.ToTime = entry.FromTime + TimeSpan.FromMinutes(5);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            results.Should().BeEmpty();
        }

        [Fact]
        public async void Should_return_entries_that_start_before_fromTime_and_end_after_fromTime()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", _fromTime - TestBlockLength);
            entry.ToTime = _fromTime + TestBlockLength * 2;

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));


            // Assert: should have the entry.
            results.Should().HaveCount(1);
            results.Should().Contain(e => e.EntryText == "1");
        }

        [Fact]
        public async void Should_not_return_entries_for_polls_other_than_the_requested_poll()
        {
            // Set up.
            InsertTimeLogEntry("1", _fromTime.AddHours(0.5), pollId: Guid.NewGuid());

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            results.Should().BeEmpty();
        }

        [Fact]
        public async void Should_sort_results_from_latest_to_earliest()
        {
            // Set up.
            InsertTimeLogEntry("1", _fromTime.AddHours(0.6));
            InsertTimeLogEntry("2", _fromTime.AddHours(0.7));
            InsertTimeLogEntry("3", _fromTime.AddHours(0.4));

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            results[0].EntryText.Should().Be("2");
            results[1].EntryText.Should().Be("1");
            results[2].EntryText.Should().Be("3");
        }

        [Fact]
        public async void Should_convert_times_to_poll_time_zone()
        {
            // Set up.
            InsertTimeLogEntry("1", _fromTime);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            var entry = results.First(e => e.EntryText == "1");
            entry.FromTime.Year.Should().Be(_fromTime.Year);
            entry.FromTime.Month.Should().Be(_fromTime.Month);
            entry.FromTime.Day.Should().Be(_fromTime.Day);
            entry.FromTime.Hour.Should().Be(_fromTime.Hour);
            entry.FromTime.Minute.Should().Be(_fromTime.Minute);
            entry.FromTime.Second.Should().Be(_fromTime.Second);
        }

        [Fact]
        public async void Should_include_TimeBlockLength()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", _fromTime);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            var resultEntry = results.First(e => e.EntryText == "1");
            resultEntry.TimeBlockLength.Should().Be(entry.GetTimeBlockLength());
        }

        [Fact]
        public async void Should_include_TimeLogEntry_Id()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", _fromTime);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            var resultEntry = results.First(e => e.EntryText == "1");
            resultEntry.Id.Should().Be(entry.Id);
        }

        [Fact]
        public async void Should_include_SubmissionType()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", _fromTime);
            entry.SubmissionType = "sometype";

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            var resultEntry = results.First(e => e.EntryText == "1");
            resultEntry.SubmissionType.Should().Be(entry.SubmissionType);
        }

        [Fact]
        public async void If_entry_has_undo_associated_with_it_should_not_include_it()
        {
            // Set up.
            var entry = InsertTimeLogEntry("1", _fromTime);
            InsertUndoTimeLogEntry(entry);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert.
            results.Should().BeEmpty();
        }

        [Fact]
        public async void If_entry_is_fully_overwritten_by_another_entry_then_should_not_include_it()
        {
            // Set up.
            var oldEntry = InsertTimeLogEntry("1", _fromTime);
            var newEntry = InsertTimeLogEntry("2", _fromTime);
            newEntry.CreatedTimeUtc = oldEntry.CreatedTimeUtc.AddSeconds(10);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(1);
            results.Should().Contain(e => e.EntryText == "2");
        }

        [Fact]
        public async void If_entry_end_is_overwritten_by_another_entry_then_should_return_only_the_part_that_is_not_overwritten()
        {
            // Set up.
            var oldEntry = InsertTimeLogEntry("1", _fromTime);
            oldEntry.ToTime = oldEntry.FromTime + TestBlockLength * 2;

            var newEntry = InsertTimeLogEntry("2", _fromTime.Add(TestBlockLength));
            newEntry.ToTime = newEntry.FromTime + TestBlockLength * 2;
            newEntry.CreatedTimeUtc = oldEntry.CreatedTimeUtc.AddSeconds(10);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(2);

            // Older entry should only have the part that's peeking out from under the new entry.
            var result1 = results.First(e => e.EntryText == "1");
            result1.TimeBlockLength.Should().Be(TestBlockLength);
            result1.FromTime.Should().Be(oldEntry.FromTime);
            result1.Id.Should().Be(oldEntry.Id);

            // Newer entry should be fully present.
            var result2 = results.First(e => e.EntryText == "2");
            result2.TimeBlockLength.Should().Be(TestBlockLength * 2);
            result2.FromTime.Should().Be(newEntry.FromTime);
            result2.Id.Should().Be(newEntry.Id);
        }

        [Fact]
        public async void If_entry_beginning_is_overwritten_by_another_entry_then_should_return_only_the_part_that_is_not_overwritten()
        {
            // Set up.
            var oldEntry = InsertTimeLogEntry("1", _fromTime.Add(TestBlockLength));
            oldEntry.ToTime = oldEntry.FromTime + TestBlockLength * 2;

            var newEntry = InsertTimeLogEntry("2", _fromTime);
            newEntry.ToTime = newEntry.FromTime + TestBlockLength * 2;
            newEntry.CreatedTimeUtc = oldEntry.CreatedTimeUtc.AddSeconds(10);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(2);

            // Older entry should only have the part that's peeking out from under the new entry.
            var result1 = results.First(e => e.EntryText == "1");
            result1.TimeBlockLength.Should().Be(TestBlockLength);
            result1.FromTime.Should().Be(newEntry.ToTime);
            result1.Id.Should().Be(oldEntry.Id);

            // Newer entry should be fully present.
            var result2 = results.First(e => e.EntryText == "2");
            result2.TimeBlockLength.Should().Be(TestBlockLength * 2);
            result2.FromTime.Should().Be(newEntry.FromTime);
            result2.Id.Should().Be(newEntry.Id);
        }

        [Fact]
        public async void If_entry_middle_is_overwritten_by_another_entry_then_should_return_only_the_parts_that_are_not_overwritten()
        {
            // Set up.
            var oldEntry = InsertTimeLogEntry("1", _fromTime);
            oldEntry.ToTime = oldEntry.FromTime + TestBlockLength * 3;

            var newEntry = InsertTimeLogEntry("2", _fromTime.Add(TestBlockLength));
            newEntry.ToTime = newEntry.FromTime + TestBlockLength;
            newEntry.CreatedTimeUtc = oldEntry.CreatedTimeUtc.AddSeconds(10);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(3);

            // Older entry should have two parts that are peeking out from under the new entry.
            // Later part of oldEntry
            var result1 = results.First(e => e.EntryText == "1");
            result1.TimeBlockLength.Should().Be(TestBlockLength);
            result1.FromTime.Should().Be(newEntry.ToTime);
            result1.Id.Should().Be(oldEntry.Id);

            // Earlier part of oldEntry
            var result2 = results.Where(e => e.EntryText == "1").Skip(1).First();
            result2.TimeBlockLength.Should().Be(TestBlockLength);
            result2.FromTime.Should().Be(_fromTime);
            result2.Id.Should().Be(oldEntry.Id);

            // Newer entry should be fully present.
            var result3 = results.First(e => e.EntryText == "2");
            result3.TimeBlockLength.Should().Be(TestBlockLength);
            result3.FromTime.Should().Be(newEntry.FromTime);
            result3.Id.Should().Be(newEntry.Id);
        }

        [Fact]
        public async void If_entry_is_fully_overwritten_by_another_entry_which_is_fully_overwritten_by_third_entry_then_should_return_only_the_third_entry()
        {
            // Set up.
            var oldestEntry = InsertTimeLogEntry("0", _fromTime);
            var oldEntry = InsertTimeLogEntry("1", _fromTime);
            oldEntry.CreatedTimeUtc = oldestEntry.CreatedTimeUtc.AddSeconds(10);

            var newEntry = InsertTimeLogEntry("2", _fromTime);
            newEntry.CreatedTimeUtc = oldEntry.CreatedTimeUtc.AddSeconds(10);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(1);
            results.Should().Contain(e => e.EntryText == "2");
        }

        [Fact]
        public async void If_entry_is_overwritten_by_another_entry_that_was_undone_then_should_return_only_the_first_entry()
        {
            // Set up.
            var oldEntry = InsertTimeLogEntry("1", _fromTime);
            var newEntry = InsertTimeLogEntry("2", _fromTime.Add(TestBlockLength));
            newEntry.CreatedTimeUtc = oldEntry.CreatedTimeUtc.AddSeconds(10);
            InsertUndoTimeLogEntry(newEntry);

            // Act.
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(1);
            results.Should().Contain(e => e.EntryText == "1");
        }

        [Fact]
        public async void Complex_entry_overwrite_scenario_1()
        {
            // Set up.
            // This is what it looks like:
            //
            //     newest        |------|
            //     middle               |-------|
            //     oldest    |----------|

            var entry1 = InsertTimeLogEntry("1", _fromTime);
            entry1.ToTime = _fromTime + TestBlockLength * 2;

            var entry2 = InsertTimeLogEntry("2", _fromTime.Add(TestBlockLength * 2));
            entry2.CreatedTimeUtc = entry1.CreatedTimeUtc.AddSeconds(10);

            var entry3 = InsertTimeLogEntry("3", _fromTime.Add(TestBlockLength));
            entry3.CreatedTimeUtc = entry2.CreatedTimeUtc.AddSeconds(10);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(3);
            results.Should().Contain(e => e.EntryText == "1");
        }

        [Fact]
        public async void Complex_entry_overwrite_scenario_2()
        {
            // Set up.
            // This is what it looks like:
            //
            //     entry3 (newest)         |------|
            //     entry2 (middle)                |-------|
            //     entry1 (oldest)    |--------------------------|
            //
            // We're most interested in the early border between entries 1 and 3.
            //

            var entry1 = InsertTimeLogEntry("1", _fromTime, _fromTime + TestBlockLength * 4);

            var entry2 = InsertTimeLogEntry("2", _fromTime.Add(TestBlockLength * 2));
            entry2.CreatedTimeUtc = entry1.CreatedTimeUtc.AddSeconds(10);

            var entry3 = InsertTimeLogEntry("3", _fromTime.Add(TestBlockLength));
            entry3.CreatedTimeUtc = entry2.CreatedTimeUtc.AddSeconds(10);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime.AddHours(1));

            // Assert
            results.Should().HaveCount(4);

            // Results: from latest to earliest should be:
            var result0 = results[0];
            result0.EntryText.Should().Be("1");

            var result1 = results[1];
            result1.EntryText.Should().Be("2");

            var results2 = results[2];
            results2.EntryText.Should().Be("3");
            results2.TimeBlockLength.Should().Be(TestBlockLength);
            results2.FromTime.Should().Be(_fromTime + TestBlockLength);

            var results3 = results[3];
            results3.EntryText.Should().Be("1");
            results3.TimeBlockLength.Should().Be(TestBlockLength);
            results3.FromTime.Should().Be(_fromTime);
        }

        [Fact]
        public async void Should_not_return_deletions()
        {
            // Set up
            InsertDeletion(_fromTime, _fromTime + TestBlockLength);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 2);

            // Assert
            results.Should().BeEmpty();
        }

        [Fact]
        public async void If_deletion_fully_covers_an_entry_should_not_return_the_entry()
        {
            // Set up
            var entry1 = InsertTimeLogEntry("1", _fromTime, _fromTime + TestBlockLength);
            var deletion = InsertDeletion(_fromTime, _fromTime + TestBlockLength);
            deletion.CreatedTimeUtc = entry1.CreatedTimeUtc + TimeSpan.FromSeconds(3);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 2);

            // Assert
            results.Should().BeEmpty();
        }

        [Fact]
        public async void If_deletion_covers_the_end_of_an_entry_should_return_the_beginning()
        {
            // Set up
            var entry1 = InsertTimeLogEntry("1", _fromTime, _fromTime + TestBlockLength * 2);
            var deletion = InsertDeletion(_fromTime + TestBlockLength, _fromTime + TestBlockLength * 3);
            deletion.CreatedTimeUtc = entry1.CreatedTimeUtc + TimeSpan.FromSeconds(3);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 2);

            // Assert
            results.Should().HaveCount(1);
            var resultEntry = results[0];
            resultEntry.FromTime.Should().Be(_fromTime);
            resultEntry.TimeBlockLength.Should().Be(TestBlockLength);
            resultEntry.EntryText.Should().Be(entry1.EntryText);
        }

        [Fact]
        public async void If_deletion_covers_the_beginning_of_an_entry_should_return_the_end()
        {
            // Set up
            var entry1 = InsertTimeLogEntry("1", _fromTime + TestBlockLength, _fromTime + TestBlockLength * 3);
            var deletion = InsertDeletion(_fromTime, _fromTime + TestBlockLength * 2);
            deletion.CreatedTimeUtc = entry1.CreatedTimeUtc + TimeSpan.FromSeconds(3);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 2);

            // Assert
            results.Should().HaveCount(1);
            var resultEntry = results[0];
            resultEntry.FromTime.Should().Be(_fromTime + TestBlockLength * 2);
            resultEntry.TimeBlockLength.Should().Be(TestBlockLength);
            resultEntry.EntryText.Should().Be(entry1.EntryText);
        }

        [Fact]
        public async void If_deletion_covers_the_middle_of_an_entry_should_return_both_ends()
        {
            // Set up
            var entry1 = InsertTimeLogEntry("1", _fromTime, _fromTime + TestBlockLength * 3);
            var deletion = InsertDeletion(_fromTime + TestBlockLength, _fromTime + TestBlockLength * 2);
            deletion.CreatedTimeUtc = entry1.CreatedTimeUtc + TimeSpan.FromSeconds(3);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 2);

            // Assert
            results.Should().HaveCount(2);
            var resultEntry1 = results[0];
            resultEntry1.FromTime.Should().Be(_fromTime + TestBlockLength * 2);
            resultEntry1.TimeBlockLength.Should().Be(TestBlockLength);
            resultEntry1.EntryText.Should().Be(entry1.EntryText);

            var resultEntry2 = results[1];
            resultEntry2.FromTime.Should().Be(_fromTime);
            resultEntry2.TimeBlockLength.Should().Be(TestBlockLength);
            resultEntry2.EntryText.Should().Be(entry1.EntryText);
        }

        [Theory]
        [InlineData(0, 0)]
        [InlineData(2, 2)]
        [InlineData(-2, -2)]
        [InlineData(1, -1)]
        public async void If_a_newer_entry_covers_the_deletion_then_should_show_the_entry(
            int fromMinutesAfterDeletionStart, int toMinutesAfterDeletionEnd)
        {
            // Set up
            var entry1 = InsertTimeLogEntry("1", _fromTime, _fromTime + TestBlockLength);
            var deletion = InsertDeletion(_fromTime - TimeSpan.FromMinutes(fromMinutesAfterDeletionStart), 
                                          _fromTime + TestBlockLength - TimeSpan.FromMinutes(toMinutesAfterDeletionEnd));
            deletion.CreatedTimeUtc = entry1.CreatedTimeUtc - TimeSpan.FromSeconds(3);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 2);

            // Assert
            results.Should().HaveCount(1);
            var resultEntry1 = results[0];
            resultEntry1.EntryText.Should().Be("1");
            resultEntry1.FromTime.Should().Be(_fromTime);
            resultEntry1.TimeBlockLength.Should().Be(TestBlockLength);
        }

        [Fact]
        public async void If_an_entry_covers_a_deletion_then_deletion_should_still_apply_to_the_rest_of_the_entries()
        {
            // This is what it looks like:
            //       new entry:                       |------------------|
            //        deletion:          |--------------------|
            //  original entry:  |---------------|

            // Set up
            var originalEntry = InsertTimeLogEntry("original", _fromTime, _fromTime + TestBlockLength * 2);
            var deletion = InsertDeletion(_fromTime + TestBlockLength, _fromTime + TestBlockLength * 3);
            deletion.CreatedTimeUtc = originalEntry.CreatedTimeUtc + TimeSpan.FromSeconds(3);
            var newEntry = InsertTimeLogEntry("new", _fromTime + TestBlockLength * 2, _fromTime + TestBlockLength * 4);
            newEntry.CreatedTimeUtc = deletion.CreatedTimeUtc + TimeSpan.FromSeconds(3);

            // Act
            var results = await _service.Get(Db, _poll.Id, _fromTime, _fromTime + TestBlockLength * 4);

            // Assert
            results.Should().HaveCount(2);
            var resultEntry1 = results[1];
            resultEntry1.EntryText.Should().Be("original");
            resultEntry1.FromTime.Should().Be(_fromTime);
            resultEntry1.TimeBlockLength.Should().Be(TestBlockLength);
        }

        //====================== Private =======================
        private TimeLogEntry InsertDeletion(DateTime fromTime, DateTime toTime)
        {
            var entry = new TimeLogEntry
            {
                Id = Guid.NewGuid(),
                PollId = DefaultPollId,
                FromTime = fromTime,
                ToTime = toTime,
                EntryText = "[deletion]",
                CreatedTimeUtc = fromTime.AddSeconds(3),
                IsDeletion = true,
            };

            Db.Mock.TimeLogEntries.QueryData.Add(entry);
            return entry;
        }
    }
}
