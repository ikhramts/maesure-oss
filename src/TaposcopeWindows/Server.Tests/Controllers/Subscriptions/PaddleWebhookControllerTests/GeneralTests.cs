using FluentAssertions;
using Moq;
using Server.Controllers.Subscriptions;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Paddle;
using Server.Tests.Mocks;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Server.Tests.Controllers.Subscriptions.PaddleWebhookControllerTests
{
    public class GeneralTests
    {
        private MockMainDbContext _db = new MockMainDbContext();
        private Mock<IPaddleWebhookSignatureVerifier> _mockVerifier;
        private PaddleWebhookController _controller;

        public GeneralTests()
        {
            _mockVerifier = new Mock<IPaddleWebhookSignatureVerifier>();
            _mockVerifier.Setup(v => v.Verify(It.IsAny<IEnumerable<KeyValuePair<string, string>>>())).Returns(true);
            _controller = new PaddleWebhookController(_mockVerifier.Object, _db);
        }

        [Fact]
        public async void If_signature_is_invalid_should_return_Unauthorized()
        {
            // Set up
            _mockVerifier.Setup(v => v.Verify(It.IsAny<IEnumerable<KeyValuePair<string, string>>>())).Returns(false);
            var message = GetMessage();

            // Act
            Func<Task> action = async () => await _controller.Post(message);

            // Assert
            action.Should().Throw<UnauthorizedException>().WithMessage("Unauthorized");
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        [InlineData(" ")]
        [InlineData("no_such_alert")]
        public void If_alert_name_is_not_recognized_should_throw(string badAlert)
        {
            // Set up
            var message = GetMessage();
            message[PaddleField.AlertName] = badAlert;

            // Act
            Func<Task> action = async () => await _controller.Post(message);

            // Assert
            action.Should().Throw<Exception>().WithMessage($"*{PaddleField.AlertName}*")
                                              .WithMessage($"*'{badAlert}'*");
        }

        [Fact]
        public void If_alert_name_is_missing_should_throw()
        {
            // Set up
            var message = GetMessage();
            message.Remove(PaddleField.AlertName);

            // Act
            Func<Task> action = async () => await _controller.Post(message);

            // Assert
            action.Should().Throw<Exception>().WithMessage($"*{PaddleField.AlertName}*")
                                              .WithMessage("*missing*");
        }

        // =================== Helpers =======================
        private Dictionary<string, string> GetMessage()
        {
            return new Dictionary<string, string>
            {
                { PaddleField.AlertName, PaddleAlertType.SubscriptionCreated },
                { "some_field", "some_value" }
            };
        }
    }
}
