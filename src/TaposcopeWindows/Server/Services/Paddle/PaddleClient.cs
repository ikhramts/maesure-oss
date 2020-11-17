using Common.Http;
using Microsoft.Extensions.Logging;
using Server.Services.Paddle.ClientMessages;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Server.Services.Paddle
{
    public class PaddleClient : IPaddleClient
    {
        public PaddleClient(string vendorId, string vendorAuthCode, IRestClient restClient, ILoggerFactory loggerFactory)
        {
            _restClient = restClient;
            _log = loggerFactory.CreateLogger<PaddleClient>();

            // Init Paddle.
            _vendorId = vendorId;
            _vendorAuthCode = vendorAuthCode;

            if (vendorId == null)
            {
                throw new Exception("Paddle vendorId is null");
            }

            if (vendorAuthCode == null)
            {
                throw new Exception("Paddle vendorAuthCode is null");
            }
        }

        public async Task<string> GeneratePayLink(long productId, int trialDays, string customerEmail, string passthrough)
        {
            var request = new GeneratePayLinkRequest
            {
                VendorId = _vendorId,
                VendorAuthCode = _vendorAuthCode,
                ProductId = productId,
                TrialDays = trialDays,
                CustomerEmail = customerEmail,
                Passthrough = passthrough
            };

            var reply = await MakePaddleRequest<GeneratePayLinkReply>(GeneratePayLinkUrl, request);
            return reply.Url;
        }

        public async Task<SubscriptionUser> GetSubscriptionUser(long subscriptionId)
        {
            var request = new ListSubscriptionUsersRequest
            {
                VendorId = _vendorId,
                VendorAuthCode = _vendorAuthCode,
                SubscriptionId = subscriptionId,
            };

            var reply = await MakePaddleRequest<List<SubscriptionUser>>(ListSubscriptionUsersUrl, request);

            if (reply.Count == 0)
            {
                throw new Exception($"No Paddle subscription with ID = {subscriptionId}");
            }
            else if (reply.Count > 0)
            {
                _log.LogWarning($"Multiple Paddle subscriptions for subscriptionId = {subscriptionId}");
            }

            return reply[0];
        }

        public async Task CancelSubscription(long subscriptionId)
        {
            var request = new CancelSubscriptionRequest
            {
                VendorId = _vendorId,
                VendorAuthCode = _vendorAuthCode,
                SubscriptionId = subscriptionId,
            };

            await MakePaddleRequest(CancelSubscriptionUrl, request);
        }

        // ========================== Private ============================
        private const string GeneratePayLinkUrl = "https://vendors.paddle.com/api/2.0/product/generate_pay_link";
        private const string ListSubscriptionUsersUrl = "https://vendors.paddle.com/api/2.0/subscription/users";
        private const string CancelSubscriptionUrl = "https://vendors.paddle.com/api/2.0/subscription/users_cancel";
        private string _vendorId;
        private string _vendorAuthCode;
        private IRestClient _restClient;
        private ILogger<PaddleClient> _log;

        /// <summary>
        /// Make a request to Paddle API and return a result.
        /// </summary>
        private async Task<T> MakePaddleRequest<T>(string url, object request)
        {
            var reply = await _restClient.PostFormUrlEncoded<PaddleReply<T>>(url, request);

            if (!reply.IsSuccess)
            {
                // Request failed for non-Paddle reason.
                throw new Exception($"Error when making request to Paddle {url}; code: '{reply.StatusCode}', message: '{reply.Error}'");
            }

            var result = reply.Result;

            if (!result.Success)
            {
                // Paddle error.
                var error = result.Error;
                throw new Exception($"Error from Paddle request to {url}: {error.Code} {error.Message}");
            }

            return result.Response;
        }

        /// <summary>
        /// Make a requst to Paddle API and do not return a result.
        /// </summary>
        private async Task MakePaddleRequest(string url, object request)
        {
            var reply = await _restClient.PostFormUrlEncoded<PaddleReply>(url, request);

            if (!reply.IsSuccess)
            {
                // Request failed for non-Paddle reason.
                throw new Exception($"Error when making request to Paddle {url}; code: '{reply.StatusCode}', message: '{reply.Error}'");
            }

            var result = reply.Result;

            if (!result.Success)
            {
                // Paddle error.
                var error = result.Error;
                throw new Exception($"Error from Paddle request to {url}: {error.Code} {error.Message}");
            }
        }
    }
}
