using Common.Http;
using Common.Time;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System;

namespace Server.Services.Auth0
{
    public class Auth0TokenService : IAuth0TokenService
    {
        public const double RetryIntervalMsec = 15000;

        public Auth0TokenService(IRestClient restClient, ITimerFactory timerFactory, ILogger<Auth0TokenService> log)
        {
            _log = log;
            _restClient = restClient;

            _timer = timerFactory.GetTimer();
            _timer.AutoReset = false;
            _timer.Elapsed += (_1, _2) => RefreshToken();

            RefreshToken();
        }

        public string Token
        {
            get
            {
                // TODO: throw exception if could not renew the token.
                if (_token == null)
                {
                    throw new Exception("Auth0 token is not available.");
                }

                return _token;
            }
        }

        public class Auth0TokenRequest
        {
            [JsonProperty("grant_type")]
            public string GrantType { get; set; }

            [JsonProperty("client_id")]
            public string ClientId { get; set; }

            [JsonProperty("client_secret")]
            public string ClientSecret { get; set; }

            [JsonProperty("audience")]
            public string Audience { get; set; }
        }

        public class Auth0TokenReply
        {
            [JsonProperty("access_token")]
            public string AccessToken { get; set; }

            [JsonProperty("expires_in")]
            public int ExpiresInSec { get; set; }

            [JsonProperty("scope")]
            public string Scope { get; set; }

            [JsonProperty("token_type")]
            public string TokenType { get; set; }
        }

        // ====================== Private ==========================
        private string _token;
        private Auth0Config _config = new Auth0Config();
        private ILogger<Auth0TokenService> _log;
        private IRestClient _restClient;
        private ITimer _timer;

        private void RefreshToken()
        {
            var tokenRequest = new Auth0TokenRequest
            {
                GrantType = "client_credentials",
                ClientId = "==== This really should not be here; can get it from config ====",
                ClientSecret = "==== This really should not be here; can get it from config ====",
                Audience = "https://maesure.auth0.com/api/v2/"
            };

            try
            {
                var tokenReply = _restClient.Post<Auth0TokenReply>(_config.TokenUrl(), tokenRequest).Result;

                if (!tokenReply.IsSuccess)
                {
                    _log.LogError("Failed to get Auth0 JWT. Details: " + tokenReply.Error);
                    StartTimer(RetryIntervalMsec);
                    return;
                }

                _token = tokenReply.Result.AccessToken;
                _log.LogInformation("Reloaded Auth0 token.");
                StartTimer(((double)tokenReply.Result.ExpiresInSec * 1000) / 2);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Exception while getting Auth0 JWT token:");
                StartTimer(RetryIntervalMsec);
            }
        }

        private void StartTimer(double timeoutMsec)
        {
            _timer.AutoReset = false;
            _timer.Interval = timeoutMsec;
            _timer.Enabled = true;
        }




    }
}
