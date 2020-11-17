using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Server.Controllers.Subscriptions;
using Server.Db;
using Server.Services.Paddle;
using Server.Tests.Mocks;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.Subscriptions.PaddleWebhookControllerTests
{
    public class SubscriptionCreatedTests
    {
        private MockMainDbContext _db = new MockMainDbContext();
        private Guid TestAccountId = new Guid("e1945246-4887-4eee-89d4-fde337718362");
        private long PaddleSubscriptionId = 2346;

        private Mock<IPaddleWebhookSignatureVerifier> _mockVerifier;
        private PaddleWebhookController _controller;

        public SubscriptionCreatedTests()
        {
            _db.Mock.Accounts.QueryData.Add(new Account { Id = TestAccountId });

            _mockVerifier = new Mock<IPaddleWebhookSignatureVerifier>();
            _mockVerifier.Setup(v => v.Verify(It.IsAny<IEnumerable<KeyValuePair<string, string>>>())).Returns(true);
            _controller = new PaddleWebhookController(_mockVerifier.Object, _db);
        }

        [Fact]
        public async void Should_set_account_PaddleSubscriptionId()
        {
            var message = GetMessage();
            var result = await _controller.Post(message);

            // Assert
            result.Should().BeOfType<OkResult>();

            var updatedAccount = _db.Mock.Accounts.Updated.First();
            updatedAccount.PaddleSubscriptionId.Should().Be(PaddleSubscriptionId);
            _db.WasSaveChangesCalled.Should().BeTrue();
        }

        [Fact]
        public async void If_account_not_found_should_throw()
        {
            // Set up an account_id that doesn't exist in DB.
            var message = GetMessage();
            message[PaddleField.Passthrough] = "{\"account_id\":\"37875fc9-61a2-4168-896e-bbc99f860c52\" }";

            Func<Task> action = async () => await _controller.Post(message);
            action.Should().Throw<Exception>().WithMessage("*account*");
            _db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("asdf")]
        [InlineData("{\"x\":\"123\"}")]
        public async void If_passthrough_does_not_have_accountId_should_throw(string passthrough)
        {
            var message = GetMessage();
            message[PaddleField.Passthrough] = passthrough;

            Func<Task> action = async () => await _controller.Post(message);
            action.Should().Throw<Exception>().WithMessage($"*{PaddleField.Passthrough}*");
            _db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Theory]
        [InlineData(PaddleSubscriptionStatus.PastDue)]
        [InlineData(PaddleSubscriptionStatus.Paused)]
        [InlineData(PaddleSubscriptionStatus.Deleted)]
        [InlineData("no such status")]
        [InlineData("")]
        [InlineData(null)]
        public void If_subscription_status_is_not_trialing_or_active_should_throw(string status)
        {
            var message = GetMessage();
            message[PaddleField.Status] = status;

            Func<Task> action = async () => await _controller.Post(message);
            action.Should().Throw<Exception>().WithMessage("*status*")
                                              .WithMessage($"*{PaddleField.AlertName}*")
                                              .WithMessage($"*{PaddleAlertType.SubscriptionCreated}*");
            _db.WasSaveChangesCalled.Should().BeFalse();
        }

        [Theory]
        [InlineData(PaddleField.SubscriptionId)]
        [InlineData(PaddleField.Status)]
        [InlineData(PaddleField.Passthrough)]
        public void If_important_field_is_not_found_should_throw(string missingField)
        {
            var message = GetMessage();
            message.Remove(missingField);

            Func<Task> action = async () => await _controller.Post(message);
            action.Should().Throw<Exception>().WithMessage($"*{missingField}*")
                                              .WithMessage("*missing*");
            _db.WasSaveChangesCalled.Should().BeFalse();
        }

        // ====================== Helpers ==========================
        private Dictionary<string, string> GetMessage()
        {
            var message = new Dictionary<string, string>
            {
                { "user_id", "7" },
                { PaddleField.AlertName, PaddleAlertType.SubscriptionCreated },
                { PaddleField.SubscriptionId, $"{PaddleSubscriptionId}" },
                { PaddleField.Status, PaddleSubscriptionStatus.Trialing },
                { "email", "some@person.com" },
                { "marketing_consent", "" },
                { "cancel_url", "https://checkout.paddle.com/subscription/cancel?user=8&subscription=2&hash=a9df988ad906b40c32a0c6ae08c0f3458995155a" },
                { "update_url", "https://checkout.paddle.com/subscription/update?user=8&subscription=5&hash=2fbc25c4128a5a8273918d9bf932c851afd3a0fd" },
                { "subscription_plan_id", "5" },
                { "next_bill_date", "2020-03-23" },
                { PaddleField.Passthrough, "{\"account_id\":\"" + TestAccountId + "\" }" },
                { "currency", "USD" },
                { "checkout_id", "8-9fc07a8693d8665-984ce7ed89" },
                { "source", "http://somesite.com" },
                { "linked_subscriptions", "" },
                { "quantity", "1" },
                { "unit_price", "4.99" },
                { PaddleField.Signature, "sdfghjk345678cvbn345tyhuj" },
            };

            return message;
        }
    }
}
