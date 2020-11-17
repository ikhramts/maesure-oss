using Common.Time;
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

namespace Server.Tests.Controllers.AccountFlagsControllerTests
{
    public class SetFlagsTests : AppControllerTestsBase
    {
        readonly DateTime UTC_NOW = DateTime.SpecifyKind(new DateTime(2019, 2, 3, 6, 30, 15), DateTimeKind.Utc);

        MockTimeService _timeSerice;
        AccountFlagsController _controller;

        public SetFlagsTests()
        {
            _timeSerice = new MockTimeService() { UtcNow = UTC_NOW };

            _controller = new AccountFlagsController(Db, UserEventsService, _timeSerice);
            SetUpLoggedInUser(_controller);
        }

        [Fact]
        public async void On_success_should_respond_with_NoContent()
        {
            // Set up
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", true }
                }
            };

            // Act
            var result = await _controller.SetFlags(request);

            // Assert
            result.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async void If_account_flag_is_not_in_DB_should_add_it_to_the_DB()
        {
            // Set up the request
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", true }
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert - the DB should now contain the flag
            var addedFlags = Db.Mock.AccountFlags.Added;
            addedFlags.Should().HaveCount(1);

            var flag1 = addedFlags.First();
            flag1.Name.Should().Be("flag1");
            flag1.Value.Should().BeTrue();
            Db.WasSaveChangesCalled.Should().BeTrue();
        }

        [Fact]
        public async void Should_correctly_set_additional_flag_columns()
        {
            // Set up
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", true }
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert - additional columns should be set up correctly
            var addedFlags = Db.Mock.AccountFlags.Added;
            var flag1 = addedFlags.First();
            flag1.Id.Should().NotBe(default);
            flag1.AccountId.Should().Be(TestAccountId);
            flag1.LastChangedTimeUtc.Should().Be(UTC_NOW);
        }

        [Fact]
        public async void If_account_flag_is_in_the_DB_should_modify_it()
        {
            // Set up
            AddAccountFlag("flag1", true);

            // The request that modifies it
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", false }
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert - the value should change
            var updatedFlags = Db.Mock.AccountFlags.Updated;
            updatedFlags.Should().HaveCount(1);

            var flag1 = updatedFlags.First();
            flag1.Name.Should().Be("flag1");
            flag1.Value.Should().Be(false);
            Db.WasSaveChangesCalled.Should().BeTrue();
        }

        [Fact]
        public async void If_flag_is_changed_should_update_last_changed_time_utc()
        {
            // Set up
            AddAccountFlag("flag1", true);

            // The request that modifies it
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", false }
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert - the last changed time was updated to now.
            var updatedFlags = Db.Mock.AccountFlags.Updated;
            var flag1 = updatedFlags.First();
            flag1.LastChangedTimeUtc.Should().Be(UTC_NOW);
        }

        [Fact]
        public async void If_flag_with_same_name_for_different_account_exists_should_not_modify_it()
        {
            // Set up
            var otherAccountId = new Guid("50b62c25-1f6d-4fd9-8004-f5d7e8e42caa");
            AddAccountFlag("flag1", true, otherAccountId);

            // The request that should not modify it
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", false }
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert - the flag was added, not modified
            Db.Mock.AccountFlags.Updated.Should().BeEmpty();
            Db.Mock.AccountFlags.Added.Should().HaveCount(1);
            Db.Mock.AccountFlags.Added.First().AccountId.Should().Be(TestAccountId);
        }

        [Fact]
        public async void If_one_account_flag_is_in_DB_and_another_is_not_should_add_and_modify_as_needed()
        {
            // Set up
            AddAccountFlag("flag1", true);

            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag1", false },
                    { "flag2", false },
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert
            var updatedFlags = Db.Mock.AccountFlags.Updated;
            var addedFlags = Db.Mock.AccountFlags.Added;

            updatedFlags.Should().HaveCount(1);
            addedFlags.Should().HaveCount(1);

            var flag1 = updatedFlags.First();
            flag1.Name.Should().Be("flag1");
            flag1.Value.Should().BeFalse();

            var flag2 = addedFlags.First();
            flag2.Name.Should().Be("flag2");
            flag2.Value.Should().BeFalse();
        }

        [Fact]
        public async void If_two_flags_are_in_DB_and_one_needs_to_be_modified_then_should_not_modify_the_other()
        {
            // Set up
            AddAccountFlag("flag1", true);
            AddAccountFlag("flag2", true);

            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { "flag2", false }
                }
            };

            // Act
            await _controller.SetFlags(request);

            // Assert
            var updatedFlags = Db.Mock.AccountFlags.Updated;

            updatedFlags.Should().HaveCount(1);

            var flag2 = updatedFlags.First();
            flag2.Name.Should().Be("flag2");
            flag2.Value.Should().BeFalse();
        }

        [Theory]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("\t ")]
        public async void AccountFlag_must_have_a_name(string name)
        {
            // Set up the request
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { name, false }
                }
            };

            var result = await _controller.SetFlags(request);

            var badRequestResult = (BadRequestObjectResult) result;
            var message = (string)badRequestResult.Value;
            message.Should().Contain("name");
        }

        [Fact]
        public async void AccountFlag_name_must_not_be_too_long()
        {
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>
                {
                    { new string('a', AccountFlag.MaxNameLength + 1), true }
                }
            };

            var result = await _controller.SetFlags(request);

            var badRequestResult = (BadRequestObjectResult)result;
            var message = (string)badRequestResult.Value;
            message.Should().Contain("name");
            message.Should().Contain("" + AccountFlag.MaxNameLength);
        }

        [Fact]
        public async void Request_should_not_be_empty()
        {
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = new Dictionary<string, bool>()
            };

            var result = await _controller.SetFlags(request);

            var badRequestResult = (BadRequestObjectResult)result;
            var message = (string)badRequestResult.Value;
        }

        [Fact]
        public async void Request_should_not_be_null()
        {
            var request = new Messages.AccountFlagSetRequest
            {
                Flags = null
            };

            var result = await _controller.SetFlags(request);

            var badRequestResult = (BadRequestObjectResult)result;
            var message = (string)badRequestResult.Value;
        }

        // ================ Helpers ===================
        private void AddAccountFlag(string name, bool value, Guid accountId = default)
        {
            var savedAccountId = accountId;

            if (accountId == default)
            {
                savedAccountId = TestAccountId;
            }

            var lastChangedTimeUtc = UTC_NOW.AddDays(-2);

            Db.Mock.AccountFlags.QueryData.Add(new AccountFlag
            {
                Id = Guid.NewGuid(),
                AccountId = savedAccountId,
                Name = name,
                Value = value,
                LastChangedTimeUtc = lastChangedTimeUtc
            });
        }
    }
}
