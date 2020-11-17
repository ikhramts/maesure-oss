using FluentAssertions;
using Moq;
using Server.Controllers;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Paddle;
using Server.Tests.Controllers.Common;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.Subscriptions.SubscriptionControllerTests
{
    public class GetPaddlePayLinkTests : AppControllerTestsBase
    {
        private readonly DateTime TestUtcNow = DateTime.SpecifyKind(new DateTime(2019, 2, 4, 17, 22, 34), DateTimeKind.Utc);

        private Mock<IPaddleClient> _mockPaddleClient = new Mock<IPaddleClient>();
        private SubscriptionController _controller;

        private const string ReturnedPayLink = "https://some/link";
        private int _capturedTrialDays;
        private string _capturedEmail;
        private string _capturedPassthrough;

        public GetPaddlePayLinkTests()
        {
            TimeService.UtcNow = TestUtcNow;

            _mockPaddleClient
                .Setup(c => c.GeneratePayLink(It.IsAny<long>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns((long productId, int trialDays, string email, string passthrough) =>
                {
                    _capturedTrialDays = trialDays;
                    _capturedEmail = email;
                    _capturedPassthrough = passthrough;

                    return Task.FromResult(ReturnedPayLink);
                });

            _controller = new SubscriptionController(Db, UserEventsService, TimeService, _mockPaddleClient.Object);
            SetUpLoggedInUser(_controller);
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public void If_user_is_not_logged_in_should_return_Unauthorized(bool hasTempAccount)
        {
            if (hasTempAccount)
            {
                SetupTempUser(_controller);
            } else
            {
                SetUpAnonymousUserWithVisitorCookie(_controller);
            }

            Func<Task> action = async () => await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            action.Should().Throw<UnauthorizedException>();
        }

        [Fact]
        public void If_account_already_has_PaddleSubscriptionId_should_return_BadRequest()
        {
            TestAccount.PaddleSubscriptionId = 123456;
            Func<Task> action = async () => await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            action.Should().Throw<BadRequestException>();
        }

        [Fact]
        public async void Should_include_account_email_in_request()
        {
            await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            _capturedEmail.Should().Be(TestEmail);
        }

        [Fact]
        public async void Should_include_account_id_in_request()
        {
            await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            _capturedPassthrough.Should().Contain($"\"account_id\":\"{TestAccountId}\"");
        }

        [Theory]
        [InlineData(-120, 1)]
        [InlineData(-1, 1)]
        [InlineData(0, 1)]
        [InlineData(1, 1)]
        [InlineData(24, 2)]
        [InlineData(25, 2)]
        [InlineData(241, 11)]
        public async void If_account_has_TrialExpiryUtc_should_set_trial_days(int trialExpiryOffsetHrs, int expectedTrialDays)
        {
            TestAccount.TrialExpiryUtc = TimeService.UtcNow.AddHours(trialExpiryOffsetHrs);
            await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            _capturedTrialDays.Should().Be(expectedTrialDays);
        }

        [Fact]
        public async void If_account_doesnt_have_TrialExpiryUtc_should_set_trial_days_to_0()
        {
            TestAccount.TrialExpiryUtc = null;
            await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            _capturedTrialDays.Should().Be(1);
        }

        [Fact]
        public async void Should_return_paddle_pay_link()
        {
            var result = await _controller.GetPaddlePayLink(SubscriptionPlan.MaesurePro.Id);
            result.Link.Should().Be(ReturnedPayLink);
        }
    }
}
