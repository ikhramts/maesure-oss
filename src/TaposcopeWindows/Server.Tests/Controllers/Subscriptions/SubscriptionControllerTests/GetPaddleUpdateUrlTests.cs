using FluentAssertions;
using Moq;
using Server.Controllers;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Paddle;
using Server.Services.Paddle.ClientMessages;
using Server.Tests.Controllers.Common;
using System;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.Subscriptions.SubscriptionControllerTests
{
    public class GetPaddleUpdateUrlTests : AppControllerTestsBase
    {
        private Mock<IPaddleClient> _mockPaddleClient = new Mock<IPaddleClient>();
        private SubscriptionController _controller;

        private const string ReturnedUpdateUrl = "https://some/link";
        private long _capturedSubscriptionId;

        public GetPaddleUpdateUrlTests()
        {
            _mockPaddleClient
                .Setup(c => c.GetSubscriptionUser(It.IsAny<long>()))
                .Returns((long subscriptionId) =>
                {
                    _capturedSubscriptionId = subscriptionId;

                    return Task.FromResult(new SubscriptionUser { UpdateUrl = ReturnedUpdateUrl });
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
            }
            else
            {
                SetUpAnonymousUserWithVisitorCookie(_controller);
            }

            Func<Task> action = async () => await _controller.GetPaddleUpdateUrl();
            action.Should().Throw<UnauthorizedException>();
        }

        [Fact]
        public void If_user_does_not_have_paddle_subscription_should_return_BadRequest()
        {
            TestAccount.PaddleSubscriptionId = null;
            Func<Task> action = async () => await _controller.GetPaddleUpdateUrl();
            action.Should().Throw<BadRequestException>();
        }

        [Fact]
        public async void Should_request_paddle_update_SubscriptionUser_for_subscriptionId()
        {
            TestAccount.PaddleSubscriptionId = 12345;
            await _controller.GetPaddleUpdateUrl();
            _capturedSubscriptionId.Should().Be(12345);
        }

        [Fact]
        public async void Should_return_paddle_update_url()
        {
            TestAccount.PaddleSubscriptionId = 12345;
            var result = await _controller.GetPaddleUpdateUrl();
            result.Link.Should().Be(ReturnedUpdateUrl);
        }
    }
}
