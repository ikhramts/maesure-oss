using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Paddle;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Server.Controllers.Subscriptions
{
    [ApiController]
    [Route("api/paddle-webhook")]
    public class PaddleWebhookController : ControllerBase
    {
        public PaddleWebhookController(IPaddleWebhookSignatureVerifier signatureVerifier, MainDbContext db)
        {
            _signatureVerifier = signatureVerifier;
            _db = db;
        }

        [HttpPost]
        [Consumes("application/x-www-form-urlencoded")]
        public async Task<IActionResult> Post([FromForm] Dictionary<string, string> message)
        {
            var valid = _signatureVerifier.Verify(message);

            if (!valid)
            {
                throw new UnauthorizedException("Unauthorized");
            }

            var alertName = GetStringField(message, PaddleField.AlertName);

            if (alertName == PaddleAlertType.SubscriptionCreated)
            {
                await ProcessSubscriptionCreated(message);
            }
            else
            {
                throw new Exception($"Unexpected {PaddleField.AlertName}: '{alertName}'");
            }

            return Ok();
        }

        // ====================== Private =====================
        private IPaddleWebhookSignatureVerifier _signatureVerifier;
        private MainDbContext _db;
        private PaddlePassthroughSerializer _passthroughSerializer = new PaddlePassthroughSerializer();

        private async Task ProcessSubscriptionCreated(Dictionary<string, string> message)
        {
            // Extract relevant message data.
            var passthrough = GetStringField(message, PaddleField.Passthrough);
            var status = GetStringField(message, PaddleField.Status);
            var subscriptionId = GetLongField(message, PaddleField.SubscriptionId);

            if (status != PaddleSubscriptionStatus.Active && status != PaddleSubscriptionStatus.Trialing)
            {
                throw new Exception($"Unexpected '{PaddleField.Status}'='{status}' in message with  {PaddleField.AlertName}={PaddleAlertType.SubscriptionCreated}");
            }

            if (string.IsNullOrWhiteSpace(passthrough))
            {
                throw new Exception($"Field '{PaddleField.Passthrough}' did not contain valid account_id");
            }

            var passthroughData = _passthroughSerializer.Deserialize(passthrough);
            var accountId = passthroughData.AccountId;

            if (accountId == default)
            {
                throw new Exception($"Field '{PaddleField.Passthrough}' did not contain valid account_id");
            }

            // Update the affected account.
            var account = await _db.Accounts.FirstOrDefaultAsync(a => a.Id == accountId);

            if (account == null)
            {
                throw new Exception("Could not find requested account.");
            }

            account.PaddleSubscriptionId = subscriptionId;
            _db.Accounts.Update(account);
            await _db.SaveChangesAsync();
        }

        private string GetStringField(Dictionary<string, string> message, string fieldName)
        {
            var found = message.TryGetValue(fieldName, out var value);

            if (!found)
            {
                throw new Exception($"Field '{fieldName}' is missing");
            }

            return value;
        }

        private long GetLongField(Dictionary<string, string> message, string fieldName)
        {
            var stringValue = GetStringField(message, fieldName);
            var parsed = long.TryParse(stringValue, out var value);

            if (!parsed)
            {
                throw new Exception($"Field '{fieldName}' was not an integer");
            }

            return value;
        }
    }
}
