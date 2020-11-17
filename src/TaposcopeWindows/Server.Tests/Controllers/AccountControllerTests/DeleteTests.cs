using FluentAssertions;
using Moq;
using Server.Controllers;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Auth0;
using Server.Services.Paddle;
using Server.Tests.Controllers.Common;
using Server.Tests.Mocks;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.AccountControllerTests
{
    public class DeleteTests : AppControllerTestsBase
    {
        private Mock<IAuth0Client> _mockAuth0Client = new Mock<IAuth0Client>();
        private Mock<IPaddleClient> _mockPaddleClient = new Mock<IPaddleClient>();
        private AccountController _controller;

        private string _capturedDeletedAuth0Id;
        private long? _capturedCancelledSubscriptionId;

        public DeleteTests()
        {
            // Mock Auth0 account deletion
            _mockAuth0Client.Setup(c => c.DeleteUser(It.IsAny<string>()))
                .Returns((string auth0Id) =>
                {
                    _capturedDeletedAuth0Id = auth0Id;
                    return Task.CompletedTask;
                });

            // Mock Paddle cancellation
            _mockPaddleClient.Setup(c => c.CancelSubscription(It.IsAny<long>()))
                .Returns((long subscriptionId) =>
                {
                    _capturedCancelledSubscriptionId = subscriptionId;
                    return Task.CompletedTask;
                });

            _controller = new AccountController(Db, 
                                                _mockAuth0Client.Object, 
                                                UserEventsService, 
                                                _mockPaddleClient.Object,
                                                MockLogger.Get<AccountController>());
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

            Func<Task> action = async () => await _controller.Delete();
            action.Should().Throw<UnauthorizedException>();
        }

        [Fact]
        public async void Should_delete_Auth0_acount()
        {
            await _controller.Delete();
            _capturedDeletedAuth0Id.Should().Be(Auth0UserId);
        }

        [Fact]
        public async void If_account_has_Paddle_subscription_should_cancel_it()
        {
            TestAccount.PaddleSubscriptionId = 12345;
            await _controller.Delete();
            _capturedCancelledSubscriptionId.Should().Be(12345);
            TestAccount.PaddleSubscriptionId.Should().Be(null);
            Db.WasSaveChangesCalled.Should().BeTrue();
        }

        [Fact]
        public async void If_account_doesnt_have_Paddle_subscription_should_not_cancel_it()
        {
            TestAccount.PaddleSubscriptionId = null;
            await _controller.Delete();
            _capturedCancelledSubscriptionId.Should().Be(null);
        }

        [Fact]
        public async void Should_mark_account_as_deleted()
        {
            await _controller.Delete();
            TestAccount.IsDeleted.Should().BeTrue();
            Db.Mock.Accounts.Updated.Should().Contain(a => a.Id == TestAccountId);
            Db.WasSaveChangesCalled.Should().BeTrue();
        }
    }
}
