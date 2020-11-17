using Common.Http;
using Common.Time;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Server.Services.Auth0;
using Server.Tests.Mocks;
using System;
using Xunit;

namespace Server.Tests.Services.Auth0
{
    public class Auth0TokenServiceTests
    {
        private MockTimerFactory _timerFactory = new MockTimerFactory();
        private MockRestClient _restClient = new MockRestClient();
        private ILogger<Auth0TokenService> _logger = MockLogger.Get<Auth0TokenService>();

        private Auth0TokenService _tokenService;

        private string _tokenToReturn = "asdfghjkrt";
        private int _expiresInSec = 2000;

        public Auth0TokenServiceTests()
        {
            var result = new Auth0TokenService.Auth0TokenReply
            {
                AccessToken = _tokenToReturn,
                ExpiresInSec = _expiresInSec,
                Scope = "x",
                TokenType = "client_credentials"
            };

            _restClient.ResultToReturn = result;
            _restClient.StatusCodeToReturn = 200;

            _tokenService = new Auth0TokenService(_restClient, _timerFactory, _logger);
        }

        [Fact]
        public void Should_request_Auth0_token_at_startup()
        {
            _tokenService.Token.Should().Be(_tokenToReturn);
        }

        [Fact]
        public void Should_set_next_token_refresh_halfway_until_expiry()
        {
            var actualInterval = _timerFactory.LastTimer.Interval;
            var expectedInterval = (double)_expiresInSec * 1000 / 2;
            actualInterval.Should().Be(expectedInterval);
            _timerFactory.LastTimer.Enabled.Should().Be(true);
        }

        [Fact]
        public void On_Auth0_failure_should_set_short_timer_interval_for_retry()
        {
            _restClient.ErrorToReturn = "Something went wrong";
            _restClient.StatusCodeToReturn = 503;

            _timerFactory.LastTimer.TriggerElapsed();

            _timerFactory.LastTimer.Interval.Should().Be(Auth0TokenService.RetryIntervalMsec);
            _timerFactory.LastTimer.Enabled.Should().Be(true);

            // The original token should remain in place.
            _tokenService.Token.Should().Be(_tokenToReturn);
        }

        [Fact]
        public void Should_treat_exceptions_as_failures_and_should_retry()
        {
            _restClient.ExceptionToThrow = new Exception("Fail!");
            _timerFactory.LastTimer.TriggerElapsed();

            _timerFactory.LastTimer.Interval.Should().Be(Auth0TokenService.RetryIntervalMsec);

            // The original token should remain in place.
            _tokenService.Token.Should().Be(_tokenToReturn);
        }

        [Fact]
        public void Should_retry_token_refresh_until_it_succeeds()
        {
            // Set up - the first call fails.
            _restClient.ExceptionToThrow = new Exception("Fail!");
            _timerFactory.LastTimer.TriggerElapsed();

            // Then the next call should succeed.
            _restClient.ExceptionToThrow = null;
            _restClient.StatusCodeToReturn = 200;
            _restClient.ResultToReturn = new Auth0TokenService.Auth0TokenReply
            {
                AccessToken = "new_token",
                ExpiresInSec = _expiresInSec,
                Scope = "x",
                TokenType = "client_credentials"
            };

            _timerFactory.LastTimer.TriggerElapsed();

            // Assert - should have the new token.
            _tokenService.Token.Should().Be("new_token");
        }

        [Fact]
        public void Should_refresh_token_when_the_timeout_timer_elapses()
        {
            // Set up - a new token to return.
            _restClient.ResultToReturn = new Auth0TokenService.Auth0TokenReply
            {
                AccessToken = "new_token",
                ExpiresInSec = _expiresInSec,
                Scope = "x",
                TokenType = "client_credentials"
            };

            _timerFactory.LastTimer.TriggerElapsed();

            // Assert - should have the new token.
            _tokenService.Token.Should().Be("new_token");
        }
    }
}
