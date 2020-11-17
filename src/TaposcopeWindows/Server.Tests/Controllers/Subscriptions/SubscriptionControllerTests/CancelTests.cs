using FluentAssertions;
using Moq;
using Server.Controllers;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Paddle;
using Server.Services.Paddle.ClientMessages;
using Server.Tests.Controllers.Common;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.Subscriptions.SubscriptionControllerTests
{
    public class CancelTests : AppControllerTestsBase
    {
        private Mock<IPaddleClient> _mockPaddleClient = new Mock<IPaddleClient>();
        private SubscriptionController _controller;

        private const string ReturnedUpdateUrl = "https://some/link";
        private readonly DateTime ReturnedNextPaymentDate = new DateTime(2019, 4, 5);
        
        private long _capturedCancelledSubscriptionId;


        public CancelTests()
        {
            TestAccount.PaddleSubscriptionId = 12345;

            // Setup GetSubscriptionUser()
            _mockPaddleClient
                .Setup(c => c.GetSubscriptionUser(It.IsAny<long>()))
                .Returns((long subscriptionId) =>
                {
                    return Task.FromResult(new SubscriptionUser
                    {
                        UpdateUrl = ReturnedUpdateUrl,
                        NextPayment = new SubscriptionUser.PaymentInfo
                        {
                            Date = ReturnedNextPaymentDate
                        }
                    });
                });

            // Setup CancelSubscription()
            _mockPaddleClient.Setup(c => c.CancelSubscription(It.IsAny<long>()))
                .Returns((long subscriptionId) =>
                {
                    _capturedCancelledSubscriptionId = subscriptionId;
                    return Task.CompletedTask;
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

            Func<Task> action = async () => await _controller.Cancel();
            action.Should().Throw<UnauthorizedException>();
        }

        [Fact]
        public void If_account_doesnt_have_PaddleSubscriptionId_should_throw_BadRequest()
        {
            TestAccount.PaddleSubscriptionId = null;
            Func<Task> action = async () => await _controller.Cancel();
            action.Should().Throw<BadRequestException>();
        }

        [Fact]
        public async void Should_set_next_payment_date_as_trial_expiry()
        {
            await _controller.Cancel();
            var expectedExpiryDate = DateTime.SpecifyKind(ReturnedNextPaymentDate, DateTimeKind.Utc);
            TestAccount.TrialExpiryUtc.Should().Be(expectedExpiryDate);
            Db.WasSaveChangesCalled.Should().BeTrue();
        }

        [Fact]
        public async void Should_send_cancellation_request()
        {
            var subscriptionId = TestAccount.PaddleSubscriptionId.Value;
            await _controller.Cancel();
            _capturedCancelledSubscriptionId.Should().Be(subscriptionId);
        }

        [Fact]
        public async void Should_remove_PaddleSubscriptionId()
        {
            await _controller.Cancel();
            TestAccount.PaddleSubscriptionId.Should().Be(null);
            Db.WasSaveChangesCalled.Should().BeTrue();
            Db.Mock.Accounts.Updated.Should().Contain(a => a.Id == TestAccountId);
        }

        //[Fact]
        //public void If_there_is_an_error_during_cancellation_request_should_not_erase_PaddleSubscriptionId()
        //{
        //    // This should happen due to exceptions being thrown, I think.
        //}
    }
}
