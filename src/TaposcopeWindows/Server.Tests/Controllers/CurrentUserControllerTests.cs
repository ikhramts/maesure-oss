using FluentAssertions;
using Messages;
using Server.Controllers;
using Server.Tests.Controllers.Common;
using Server.Tests.Mocks;
using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;

namespace Server.Tests.Controllers
{
    public class CurrentUserControllerTests : AppControllerTestsBase
    {
        private CurrentUserController _controller;

        public CurrentUserControllerTests()
        {
            TimeService.UtcNow = new DateTime(2019, 2, 1, 12, 3, 0);
            _controller = new CurrentUserController(Db, UserEventsService, MockLogger.Get<CurrentUserController>(), TimeService);
        }


        [Fact]
        public async void If_user_is_not_logged_in_and_is_not_temp_usershould_return_none_user()
        {
            // Set up
            SetUpAnonymousUser(_controller);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountType.Should().Be(AccountType.None);
            user.AccountProvider.Should().Be(AccountProvider.None);
            user.Email.Should().Be(null);
            user.Flags.Should().BeEmpty();
        }

        [Fact]
        public async void If_user_is_not_logged_in_but_has_temp_account_should_return_temp_account()
        {
            SetupTempUser(_controller);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountType.Should().Be(AccountType.Temporary);
            user.AccountProvider.Should().Be(AccountProvider.None);
            user.Email.Should().Be(null);
            user.Flags.Should().BeEmpty();
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public async void If_user_is_logged_in_and_has_paddle_subscription_id_should_set_account_type_to_Pro(bool hasExpiry)
        {
            // Set up
            SetUpLoggedInUser(_controller);
            TestAccount.PaddleSubscriptionId = 123456;

            if (hasExpiry)
            {
                TestAccount.TrialExpiryUtc = new DateTime(2019, 2, 4, 12, 3, 0);
            }

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountType.Should().Be(AccountType.Pro);
        }

        [Fact]
        public async void If_user_is_logged_in_and_no_paddle_subscription_and_has_trial_expiry_should_set_account_to_ProTrial()
        {
            // Set up
            SetUpLoggedInUser(_controller);
            TestAccount.TrialExpiryUtc = new DateTime(2019, 2, 4, 12, 3, 0);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountType.Should().Be(AccountType.ProTrial);
        }

        [Fact]
        public async void If_user_is_logged_and_has_TrialExpiryUtc_in_the_past_and_no_PaddleSubscriptionId_should_set_account_to_ProTrialExpired()
        {
            // Set up
            SetUpLoggedInUser(_controller);
            TestAccount.TrialExpiryUtc = TimeService.UtcNow.AddMinutes(-1);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountType.Should().Be(AccountType.ProTrialExpired);
        }

        [Fact]
        public async void If_user_is_logged_in_and_no_paddle_subscription_or_expiry_should_set_account_to_FreePermanent()
        {
            // Set up
            SetUpLoggedInUser(_controller);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountType.Should().Be(AccountType.FreePermanent);
        }

        [Theory]
        [InlineData(false, false, false)]
        [InlineData(true, false, false)]
        [InlineData(true, true, false)]
        [InlineData(true, false, true)]
        [InlineData(true, true, true)]
        // Other choices that were left out don't make sense.
        public async void Should_load_account_flags(bool loggedIn, bool hasPaddleSubsciptionId, bool hasExpiry)
        {
            // Set up the account.
            if (loggedIn)
            {
                SetUpLoggedInUser(_controller);
            }
            else
            {
                SetupTempUser(_controller);
            }

            if (hasPaddleSubsciptionId)
            {
                TestAccount.PaddleSubscriptionId = 123456;
            }

            if (hasExpiry)
            {
                TestAccount.TrialExpiryUtc = new DateTime(2019, 2, 4, 12, 3, 0);
            }

            // Setup account flags.
            var flag1 = new Db.AccountFlag { AccountId = TestAccountId, Name = "abc", Value = true };
            var flag2 = new Db.AccountFlag { AccountId = TestAccountId, Name = "def", Value = false };

            Db.Mock.AccountFlags.QueryData.Add(flag1);
            Db.Mock.AccountFlags.QueryData.Add(flag2);

            // Act
            var user = await _controller.Get();

            // Assert
            var resultFlag1 = user.Flags.First(f => f.Key == flag1.Name);
            resultFlag1.Value.Should().Be(flag1.Value);

            var resultFlag2 = user.Flags.First(f => f.Key == flag2.Name);
            resultFlag2.Value.Should().Be(flag2.Value);
        }

        [Fact]
        public async void If_user_is_logged_in_should_include_user_email()
        {
            SetUpLoggedInUser(_controller);
            var user = await _controller.Get();
            user.Email.Should().Be(TestEmail);
        }

        [Theory]
        [InlineData("google-oauth2|12345678fg", AccountProvider.Google)]
        [InlineData("auth0|12345678fg", AccountProvider.UsernamePassword)]
        public async void Should_set_account_provider(string auth0UserId, AccountProvider expectedProvider)
        {
            // Set up
            Auth0UserId = auth0UserId;
            TestAccount.Auth0UserId = Auth0UserId;
            SetUpLoggedInUser(_controller);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountProvider.Should().Be(expectedProvider);
        }

        [Theory]
        [InlineData("fghjkl")]
        [InlineData("")]
        [InlineData("no-such|dfghjkl")]
        [InlineData("|dfghjkl")]
        public async void If_account_provider_is_not_recognized_should_set_None_provider(string auth0UserId)
        {
            // Set up
            Auth0UserId = auth0UserId;
            TestAccount.Auth0UserId = Auth0UserId;
            SetUpLoggedInUser(_controller);

            // Act
            var user = await _controller.Get();

            // Assert
            user.AccountProvider.Should().Be(AccountProvider.None);
        }

        [Fact]
        public async void If_account_has_TrialExpiryUtc_then_should_set_user_TrialExpiryUtc()
        {
            // Set up
            SetUpLoggedInUser(_controller);
            TestAccount.TrialExpiryUtc = new DateTime(2019, 2, 3, 4, 30, 0);

            // Act
            var user = await _controller.Get();

            // Assert
            user.TrialExpiryUtc.Should().Be(TestAccount.TrialExpiryUtc);
        }

        [Theory]
        [InlineData("2019-03-01 12:00:00", "2019-03-01 12:00:00", 1)]
        [InlineData("2019-03-01 12:00:00", "2019-03-01 11:00:00", 1)]
        [InlineData("2019-03-01 12:00:00", "2019-02-28 12:00:01", 1)]
        [InlineData("2019-03-01 12:00:00", "2019-02-28 12:00:00", 2)]
        [InlineData("2019-03-01 12:00:00", "2019-02-28 11:00:00", 2)]
        [InlineData("2019-03-01 12:00:00", "2019-03-01 12:00:01", 0)]
        [InlineData("2019-03-01 12:00:00", "2019-03-02 12:00:01", 0)]
        [InlineData("2019-03-01 12:00:00", "2019-04-02 12:00:00", 0)]
        public async void If_user_is_trialing_should_set_RemainingTrialDays(string trialExpiry, string utcNow, int expectedRemainingDays)
        {
            TimeService.UtcNow = DateTime.Parse(utcNow);

            // Set up a user with a trial expiry date.
            SetUpLoggedInUser(_controller);
            TestAccount.TrialExpiryUtc = DateTime.Parse(trialExpiry);

            // Act
            var user = await _controller.Get();

            // Assert
            user.RemainingTrialDays.Should().Be(expectedRemainingDays);
        }

        [Theory]
        [InlineData(false, false, false)]
        [InlineData(true, false, false)]
        [InlineData(true, true, false)]
        [InlineData(true, true, true)]
        // Other choices that were left out don't make sense or aren't the right test cases.
        public async void If_user_is_not_trialing_should_set_RemainingTrialDays_to_0(bool loggedIn, bool hasPaddleSubsciptionId, bool hasExpiry)
        {
            // Set up the account.
            if (loggedIn)
            {
                SetUpLoggedInUser(_controller);
            }
            else
            {
                SetupTempUser(_controller);
            }

            if (hasPaddleSubsciptionId)
            {
                TestAccount.PaddleSubscriptionId = 123456;
            }

            if (hasExpiry)
            {
                TestAccount.TrialExpiryUtc = new DateTime(2019, 2, 4, 12, 3, 0);
            }

            // Act
            var user = await _controller.Get();

            // Assert
            user.RemainingTrialDays.Should().Be(0);
        }

        [Fact]
        public async void If_user_is_logged_in_and_has_picture_claim_should_include_it_in_result()
        {
            // Set up a user with a picture
            var pictureUrl = "http://some/url/pic.jpg";
            var additionalClaims = new Dictionary<string, string>
            {
                { "picture", pictureUrl }
            };

            SetUpLoggedInUser(_controller, additionalClaims);

            // Act
            var user = await _controller.Get();

            // Assert
            user.Picture.Should().Be(pictureUrl);
        }

        [Fact]
        public async void If_user_is_logged_in_and_doesnt_have_picture_claim_should_set_Picture_to_null()
        {
            SetUpLoggedInUser(_controller);

            // Act
            var user = await _controller.Get();

            // Assert
            user.Picture.Should().Be(null);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public async void If_user_is_not_logged_in_should_set_Picture_to_null(bool tempUser)
        {
            // Set up
            if (tempUser)
            {
                SetupTempUser(_controller);
            }
            else
            {
                SetUpAnonymousUser(_controller);
            }

            // Act
            var user = await _controller.Get();

            // Assert
            user.Picture.Should().Be(null);
        }

    }
}
