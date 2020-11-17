using FluentAssertions;
using Messages;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers.Summaries;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.TimeLog;
using Server.Tests.Controllers.Common;
using Server.Tests.Mocks;
using System;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.Summaries
{
    public class DailySummaryControllerTests : AppControllerTestsBase
    {
        private DateTime _fromDate = new DateTime(2019, 2, 12);
        private DateTime _toDate = new DateTime(2019, 2, 12);
        private MockTimeLogService _timeLogService = new MockTimeLogService();

        private DailySummaryController _controller;

        public DailySummaryControllerTests() : base()
        {
            _controller = new DailySummaryController(Db, _timeLogService, new MockLoggerFactory(), UserEventsService);
            SetUpLoggedInUser(_controller);
        }

        [Fact]
        public async void For_each_date_in_range_should_include_it_in_the_result_set()
        {
            var fromDate = new DateTime(2019, 3, 14);
            var toDate = new DateTime(2019, 3, 16);

            var reply = await _controller.Get(fromDate, toDate);

            reply.Dates.Should().HaveCount(3);
            reply.Dates.Should().ContainInOrder(fromDate, fromDate.AddDays(1), fromDate.AddDays(2));
        }

        [Theory]
        [InlineData(0)]      // Beginning of the test day
        [InlineData(23.99)]  // End of the test day
        public async void If_activity_was_performed_in_the_dates_in_range_should_include_it_in_the_summary(double hoursOffset)
        {
            // Set up.
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(hoursOffset));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            reply.Activities.Should().Contain(a => a.Name == "Thing");
        }

        [Theory]
        [InlineData(-1)]      // Before the test day
        [InlineData(24)]     // After the test day
        public async void If_activity_was_not_performed_in_the_dates_in_range_should_not_include_it_in_the_summary(double hoursOffset)
        {
            // Set up.
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(hoursOffset));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            reply.Activities.Should().NotContain(a => a.Name == "Thing");
        }

        [Theory]
        [InlineData(1)]
        [InlineData(5)]
        public async void Time_spent_per_day_array_length_should_be_the_number_of_days_in_the_range(int daysInRange)
        {
            // Set up.
            _toDate = _fromDate.AddDays(daysInRange - 1); // Subtract 1 because we also include the last day
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(6));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.TimeSpentPerDay.Should().HaveCount(daysInRange);
        }

        [Theory]
        [InlineData(-4)] // 4 hours before the day starts
        [InlineData(22)] // 2 hours before the day ends
        public async void If_the_activity_is_partly_in_the_selected_range_then_should_include_only_the_overlapping_part(double hoursOffset)
        {
            // Set up.
            var entry = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(hoursOffset));
            entry.TimeBlockLength = TimeSpan.FromHours(6);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.TimeSpentPerDay[0].Should().Be(TimeSpan.FromHours(2));
        }

        [Fact]
        public async void If_activity_was_performed_more_than_once_on_a_given_day_should_calculate_the_total_time_spent()
        {
            // Set up.
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(6));
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert. TODO: implement
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.TimeSpentPerDay.First().Should().Be(TimeSpan.FromMinutes(10));
        }

        [Fact]
        public async void If_activity_was_performed_on_separate_days_should_calculate_totals_for_both_days()
        {
            // Set up.
            _toDate = _fromDate.AddDays(1);
            var response1 = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(6));             // Response on day 1
            var response2 = AddTimeLogEntryMsg("Thing", _fromDate.AddDays(1).AddHours(7));  // Response on day 2

            response1.TimeBlockLength = TimeSpan.FromMinutes(8);
            response2.TimeBlockLength = TimeSpan.FromMinutes(9);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert. TODO: implement
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.TimeSpentPerDay[0].Should().Be(TimeSpan.FromMinutes(8));
            activity.TimeSpentPerDay[1].Should().Be(TimeSpan.FromMinutes(9));
        }

        [Fact]
        public async void If_activity_is_included_in_summary_but_was_not_performed_on_the_day_should_calculate_total_of_0_for_that_day()
        {
            // Set up. No response for a given activity on day 2.
            _toDate = _fromDate.AddDays(1);
            var response1 = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(6));             // Response on day 1

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert. TODO: implement
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.TimeSpentPerDay[1].Should().Be(TimeSpan.Zero);
        }

        [Fact]
        public async void If_two_activities_were_performed_on_the_same_day_should_separate_their_totals()
        {
            var thing1 = AddTimeLogEntryMsg("Thing 1", _fromDate.AddHours(6));
            var thing2 = AddTimeLogEntryMsg("Thing 2", _fromDate.AddHours(7));
            thing1.TimeBlockLength = TimeSpan.FromMinutes(8);
            thing2.TimeBlockLength = TimeSpan.FromMinutes(9);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert. TODO: implement
            var thing1Activity = reply.Activities.First(a => a.Name == "Thing 1");
            var thing2Activity = reply.Activities.First(a => a.Name == "Thing 2");
            thing1Activity.TimeSpentPerDay[0].Should().Be(TimeSpan.FromMinutes(8));
            thing2Activity.TimeSpentPerDay[0].Should().Be(TimeSpan.FromMinutes(9));
        }

        [Fact]
        public void If_to_time_is_before_from_time_then_should_return_400_Bad_Request()
        {
            Func<Task<DailySummaryReply>> action = async () => await _controller.Get(_fromDate, _fromDate.AddDays(-1));
            action.Should()
                .Throw<BadRequestException>()
                .WithMessage("*to*")
                .WithMessage("*from*");
        }

        [Fact]
        public void If_queried_time_period_is_too_long_should_return_BadRequest()
        {
            Func<Task<DailySummaryReply>> action = async () => await _controller.Get(_fromDate, _fromDate.AddDays(DailySummaryController.MaxAllowedDaysInRange + 1));
            action.Should()
                .Throw<BadRequestException>()
                .WithMessage("*range*")
                .WithMessage($"*{ DailySummaryController.MaxAllowedDaysInRange }*");
        }

        [Fact]
        public void If_the_user_has_no_active_polls_should_throw_exception()
        {
            // Set up.
            DefaultPoll.IsActive = false;

            // Act/assert.
            Func<DailySummaryReply> action = () => _controller.Get(_fromDate, _toDate).Result;
            action.Should().Throw<Exception>();
        }

        [Fact]
        public async void Should_place_date_boundaries_at_midnight_in_the_reported_time_zone()
        {
            // Set up.
            _toDate = _fromDate.AddDays(1);
            var thing1 = AddTimeLogEntryMsg("Thing 1", _fromDate.AddHours(23.99));  // Should be on Day 1
            var thing2 = AddTimeLogEntryMsg("Thing 2", _fromDate.AddHours(24));     // Should be on Day 2

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            var thing1Activity = reply.Activities.First(a => a.Name == "Thing 1");
            var thing2Activity = reply.Activities.First(a => a.Name == "Thing 2");
            thing1Activity.TimeSpentPerDay[0].Should().BeGreaterThan(TimeSpan.Zero);
            thing2Activity.TimeSpentPerDay[1].Should().BeGreaterThan(TimeSpan.Zero);
        }

        [Fact]
        public async void Should_set_activity_key_to_name_if_the_activity_has_no_corresponding_activity_group()
        {
            // Set up.
            var thing1 = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.Key.Should().Be("name|Thing");
        }

        [Fact]
        public async void Should_match_poll_responses_to_activity_group_with_poll_response_text()
        {
            // Given:
            // There is a poll response with text "Thing"
            // And there is an ActivityGroup with MatchResponseText = Thing
            // And that ActivityGroup has no other children
            // And that ActivityGroup has no parent
            var entry = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));
            InsertActivityGroup("ThingGroup", matchResponseText: "Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Then:
            // Should create DailySummaryForActivity that corresponds to that ActivityGroup
            // And should sum up all corresponding entries in that DailySummaryForActivity
            // And that DailySummaryForActivity should not have any children.
            var activity = reply.Activities.First(a => a.Name == "ThingGroup");
            activity.Children.Should().BeNullOrEmpty();
            activity.TimeSpentPerDay.Should().HaveCount(1);
            activity.TimeSpentPerDay[0].Should().Be(entry.TimeBlockLength);
            activity.TracksPollResponseText.Should().Be(true);
        }

        [Fact]
        public async void If_activity_group_that_matches_poll_response_text_has_other_children_should_create_separate_node_for_this_activity()
        {
            // Given:
            // There is a poll responses with text "Thing" and "Thing2"
            // And there are ActivityGroups that match response text for each of the above responses
            // And ActivityGroup for "Thing" is a parent of the ActivityGroup for "Thing2"
            var entry = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));
            var parent = InsertActivityGroup("Thing", matchResponseText: "Thing");

            AddTimeLogEntryMsg("Thing2", _fromDate.AddHours(7));
            InsertActivityGroup("Thing2", parentId: parent.Id, matchResponseText: "Thing2");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Then:
            // Should create a top-level DailySummaryForActivity named "Thing"
            // It should have a child also named "Thing", which should contain immediate totals of all "Thing" responses
            // And it should also have a child named "Thing2"
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.Children.Should().HaveCount(2);

            var thingSubactivity = activity.Children.First(a => a.Name == "Thing");
            thingSubactivity.Children.Should().BeNullOrEmpty();
            thingSubactivity.TimeSpentPerDay.Should().HaveCount(1);
            thingSubactivity.TimeSpentPerDay[0].Should().Be(entry.TimeBlockLength);
            thingSubactivity.TracksExactParentMatches.Should().Be(true);

            activity.Children.Should().Contain(a => a.Name == "Thing2");
            activity.TracksPollResponseText.Should().Be(true);
        }

        [Fact]
        public async void Should_set_TracksExactParentMatches_to_false_for_normal_activity_groups()
        {
            // Given:
            var entry = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));
            InsertActivityGroup("ThingGroup", matchResponseText: "Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Then:
            var activity = reply.Activities.First(a => a.Name == "ThingGroup");
            activity.TracksExactParentMatches.Should().Be(false);
        }

        [Fact]
        public async void If_activity_group_has_a_parent_should_match_it_to_parent()
        {
            // Given:
            var parent = InsertActivityGroup("Parent");
            InsertActivityGroup("Thing", parentId: parent.Id, matchResponseText: "Thing");

            var entry = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activity = reply.Activities.First(a => a.Name == "Parent");
            activity.Children.Should().HaveCount(1);

            var thingActivity = activity.Children.First(a => a.Name == "Thing");
            thingActivity.TimeSpentPerDay.Should().HaveCount(1);
            thingActivity.TimeSpentPerDay[0].Should().Be(entry.TimeBlockLength);
        }

        [Fact]
        public async void If_two_activity_groups_have_same_parent_then_in_output_the_parent_should_have_both_as_children()
        {
            // Given
            var parent = InsertActivityGroup("Parent");
            InsertActivityGroup("Thing1", parentId: parent.Id, matchResponseText: "Thing1");
            InsertActivityGroup("Thing2", parentId: parent.Id, matchResponseText: "Thing2");

            var entry1 = AddTimeLogEntryMsg("Thing1", _fromDate.AddHours(7));
            var entry2 = AddTimeLogEntryMsg("Thing2", _fromDate.AddHours(8));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activity = reply.Activities.First(a => a.Name == "Parent");
            activity.Children.Should().HaveCount(2);
            activity.Children.Should().Contain(a => a.Name == "Thing1");
            activity.Children.Should().Contain(a => a.Name == "Thing2");
        }

        [Fact]
        public async void If_ActivityGroup_has_matchResponseText_and_no_children_And_if_no_response_matches_it_then_should_not_include_it_in_output()
        {
            // Given
            InsertActivityGroup("Thing", matchResponseText: "Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            reply.Activities.Should().NotContain(a => a.Name == "Thing");
        }

        [Fact]
        public async void If_a_child_ActivityGroup_has_matchResponseText_and_no_children_And_if_no_response_matches_it_then_should_not_include_it_in_output()
        {
            // Given
            var parent = InsertActivityGroup("Parent");
            InsertActivityGroup("Child", parentId: parent.Id, matchResponseText: "Child");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activity = reply.Activities.First(a => a.Name == "Parent");
            activity.Children.Should().BeNullOrEmpty();
        }

        [Fact]
        public async void If_ActivityGroup_has_matchResponseText_and_has_children_And_if_no_response_matches_it_then_must_include_it_in_output()
        {
            // Given
            var parent = InsertActivityGroup("Thing", matchResponseText: "Thing");
            InsertActivityGroup("Child", parentId: parent.Id);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            reply.Activities.Should().Contain(a => a.Name == "Thing");
        }

        [Fact]
        public async void If_ActivityGroup_does_not_have_matchResponseText_and_has_no_children_then_include_it_in_the_output()
        {
            // Given
            InsertActivityGroup("Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            reply.Activities.Should().Contain(a => a.Name == "Thing");
        }

        [Fact]
        public async void If_ActivityGroup_does_not_have_matchResponseText_and_has_hidden_children_then_should_include_it_in_the_output()
        {
            // Given
            var parent = InsertActivityGroup("Thing", matchResponseText: "Thing");
            InsertActivityGroup("Child", parentId: parent.Id, matchResponseText: "Thing 2");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            reply.Activities.Should().Contain(a => a.Name == "Thing");
        }

        [Fact]
        public async void Should_set_ActivityGroupId_if_DailySummaryForActivity_corresponds_to_an_ActivityGroup()
        {
            // Given
            var activityGroup = InsertActivityGroup("Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activitySummary = reply.Activities.First(a => a.Name == "Thing");
            activitySummary.ActivityGroupId.Should().Be(activityGroup.Id);
        }

        [Fact]
        public async void Should_not_set_ActivityGroupId_if_DailySummaryForActivity_has_no_corresponding_ActivityGroup()
        {
            // Given
            AddTimeLogEntryMsg("Thing1", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activitySummary = reply.Activities.First(a => a.Name == "Thing1");
            activitySummary.ActivityGroupId.Should().BeNull();
        }

        [Fact]
        public async void Should_not_set_ActivityGroupId_if_DailySummaryForActivity_was_created_for_matching_ActivityGroup_that_has_other_children()
        {
            // Given
            var activityGroup = InsertActivityGroup("Thing", matchResponseText: "Thing");
            InsertActivityGroup("Subthing", parentId: activityGroup.Id);
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var parentActivitySummary = reply.Activities.First(a => a.Name == "Thing");
            var childActivitySummary = parentActivitySummary.Children.First(a => a.Name == "Thing");

            parentActivitySummary.ActivityGroupId.Should().Be(activityGroup.Id);
            childActivitySummary.ActivityGroupId.Should().BeNull();
        }

        [Fact]
        public async void Should_propagate_ActivityGroup_properties()
        {
            // Given
            var activityGroup = InsertActivityGroup("Thing");
            activityGroup.Position = 12;

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activitySummary = reply.Activities.First(a => a.Name == "Thing");
            activitySummary.Position.Should().Be(activityGroup.Position);
        }

        [Fact]
        public async void Should_propagate_ActivityGroup_ParentId()
        {
            // Given
            var parent = InsertActivityGroup("Parent");
            InsertActivityGroup("Child", parentId: parent.Id);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var parentSummary = reply.Activities.First(a => a.Name == "Parent");
            var childSummary = parentSummary.Children.First(a => a.Name == "Child");
            childSummary.ParentActivityGroupId.Should().Be(parent.Id);
        }

        [Fact]
        public async void Should_set_Key_to_be_ActivityGroupId_if_it_is_not_null()
        {
            // Given
            var activityGroup = InsertActivityGroup("Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activitySummary = reply.Activities.First(a => a.Name == "Thing");
            activitySummary.Key.Should().Be($"id|{activityGroup.Id}");
        }

        [Fact]
        public async void Should_set_Key_to_be_activity_name_if_ActivityGroupId_is_null()
        {
            // Given
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activitySummary = reply.Activities.First(a => a.Name == "Thing");
            activitySummary.Key.Should().Be("name|Thing");
        }

        [Fact]
        public async void Shuold_set_Key_to_be_activity_name_if_DailySummaryForActivity_was_created_for_matching_ActivityGroup_that_has_other_children()
        {
            // Given
            var activityGroup = InsertActivityGroup("Thing", matchResponseText: "Thing");
            InsertActivityGroup("Subthing", parentId: activityGroup.Id);
            AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var parentActivitySummary = reply.Activities.First(a => a.Name == "Thing");
            var childActivitySummary = parentActivitySummary.Children.First(a => a.Name == "Thing");

            parentActivitySummary.Key.Should().Be($"id|{activityGroup.Id}");
            childActivitySummary.Key.Should().Be("name|Thing");
        }

        [Fact]
        public async void Group_time_totals_should_be_child_time_totals()
        {
            // Set up
            var activityGroup = InsertActivityGroup("Thing", matchResponseText: "Thing");
            var childGroup = InsertActivityGroup("Subthing", parentId: activityGroup.Id);
            InsertActivityGroup("Sub-subthing 1", parentId: childGroup.Id, matchResponseText: "Sub-subthing 1");
            InsertActivityGroup("Sub-subthing 2", parentId: childGroup.Id, matchResponseText: "Sub-subthing 2");

            var response1 = AddTimeLogEntryMsg("Thing", _fromDate.AddHours(7));
            var response2 = AddTimeLogEntryMsg("Sub-subthing 1", _fromDate.AddHours(7));
            var response3 = AddTimeLogEntryMsg("Sub-subthing 2", _fromDate.AddHours(7));

            response1.TimeBlockLength = TimeSpan.FromMinutes(11);
            response2.TimeBlockLength = TimeSpan.FromMinutes(12);
            response3.TimeBlockLength = TimeSpan.FromMinutes(13);

            // Act
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var thingActivitySummary = reply.Activities.First(a => a.Name == "Thing");

            thingActivitySummary.TimeSpentPerDay[0].Should().Be(TimeSpan.FromMinutes(36));

            var subthingActivitySummary = thingActivitySummary.Children.First(a => a.Name == "Subthing");
            subthingActivitySummary.TimeSpentPerDay[0].Should().Be(TimeSpan.FromMinutes(25));
        }

        [Fact]
        public async void Parent_group_time_spent_per_day_array_length_should_be_the_number_of_days_in_the_range()
        {
            // Set up
            var activityGroup = InsertActivityGroup("Thing", matchResponseText: "Thing");
            var childGroup = InsertActivityGroup("Subthing", parentId: activityGroup.Id, matchResponseText: "Subthing");

            AddTimeLogEntryMsg("Subthing", _fromDate.AddHours(7));

            _toDate = _fromDate.AddDays(12);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var thingActivitySummary = reply.Activities.First(a => a.Name == "Thing");
            thingActivitySummary.TimeSpentPerDay.Should().HaveCount(13);

            var subthingActivitySummary = thingActivitySummary.Children.First(a => a.Name == "Subthing");
            subthingActivitySummary.TimeSpentPerDay.Should().HaveCount(13);
        }

        [Fact]
        public async void Should_set_TracksPollResponseText_to_false_for_user_created_activity_groups()
        {
            // Given
            var activityGroup = InsertActivityGroup("Thing");

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert
            var activitySummary = reply.Activities.First(a => a.Name == "Thing");
            activitySummary.TracksPollResponseText.Should().Be(false);
        }

        [Fact]
        public async void Should_set_TracksPollResponseText_to_true_for_activities_created_from_poll_responses()
        {
            // Set up.
            AddTimeLogEntryMsg("Thing", _fromDate);

            // Act.
            var reply = await _controller.Get(_fromDate, _toDate);

            // Assert.
            var activity = reply.Activities.First(a => a.Name == "Thing");
            activity.TracksPollResponseText.Should().Be(true);
        }

        [Fact]
        public async void Should_pass_correct_poll_to_timeLogService()
        {
            await _controller.Get(_fromDate, _toDate);
            _timeLogService.LastGetPollId.Should().Be(DefaultPollId);
        }

        [Fact]
        public async void Should_pass_correct_fromTime_to_timeLogService()
        {
            await _controller.Get(_fromDate, _toDate);
            _timeLogService.LastGetFromTime.Should().Be(_fromDate);
        }

        [Fact]
        public async void Should_pass_correct_toTime_to_timeLogService()
        {
            await _controller.Get(_fromDate, _toDate);

            // Should request all entries until the END of _toDate.
            _timeLogService.LastGetToTime.Should().Be(_toDate + TimeSpan.FromDays(1));
        }

        //===================== Private helpers =========================

        private static DailySummaryReply GetReplyObject(IActionResult result)
        {
            var objectResult = (OkObjectResult)result;
            var dailyTotalsReply = (DailySummaryReply)objectResult.Value;
            var totals = dailyTotalsReply;
            return totals;
        }

        private TimeLogEntryMsg AddTimeLogEntryMsg(string entryText, DateTime fromTime)
        {
            var timeBlockLength = TimeSpan.FromMinutes(5);

            var entry = new TimeLogEntryMsg
            {
                Id = Guid.NewGuid(),
                EntryText = entryText,
                TimeBlockLength = timeBlockLength,
                FromTime = fromTime,
                CreatedTimeUtc = fromTime.AddSeconds(3),
            };

            _timeLogService.Data.Add(entry);
            return entry;
        }
    }
}
