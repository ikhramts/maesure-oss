using Common.Time;
using Messages;
using Microsoft.AspNetCore.Mvc;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Paddle;
using Server.Services.UserEvents;
using System;
using System.Threading.Tasks;

namespace Server.Controllers
{

    [ApiController]
    [Route("api/subscription")]
    public class SubscriptionController : AppControllerBase
    {
        public SubscriptionController(MainDbContext db, IUserEventsService userEventsService, 
            ITimeService timeService, IPaddleClient paddleClient) 
            : base(db, userEventsService)
        {
            _timeService = timeService;
            _paddleClient = paddleClient;
            _passthroughSerializer = new PaddlePassthroughSerializer();
        }

        [HttpGet("paddle-pay-link")]
        public async Task<PaddleLinkReply> GetPaddlePayLink([FromQuery] Guid subscriptionPlanId)
        {
            // Get the subscription plan.
            var gotPlan = SubscriptionPlan.PlansById.TryGetValue(subscriptionPlanId, out var plan);

            if (!gotPlan)
            {
                throw new NotFoundException($"Cannot find plan '{subscriptionPlanId}'");
            }

            // Get the user details.
            var account = await GetLoggedInAccountAsync();
 
            if (account.PaddleSubscriptionId != null)
            {
                throw new BadRequestException("You already have a subscription.");
            }

            var email = GetLoggedInUserEmail();

            // Figure out the remaining trial days.
            var remainingTrialDays = 1;

            if (account.TrialExpiryUtc != null)
            {
                var trialExpiryUtc = account.TrialExpiryUtc.Value;
                var utcNow = _timeService.UtcNow.Date;
                remainingTrialDays = (int)Math.Floor((trialExpiryUtc - utcNow).TotalDays + 1);
                remainingTrialDays = Math.Max(remainingTrialDays, 1);
            }

            // Prep passthrough data.
            var productId = plan.PaddleProductId;
            var passthrough = _passthroughSerializer.Serialize(account.Id);

            // Send the request to Paddle.
            var url = await _paddleClient.GeneratePayLink(productId, remainingTrialDays, email, passthrough);
            var result = new PaddleLinkReply { Link = url };
            return result;
        }

        [HttpGet("paddle-update-url")]
        public async Task<PaddleLinkReply> GetPaddleUpdateUrl()
        {
            var account = await GetLoggedInAccountAsync();
            var subscriptionId = account.PaddleSubscriptionId;

            if (subscriptionId == null)
            {
                throw new BadRequestException("You do not have a subscription.");
            }

            var subscriptionUser = await _paddleClient.GetSubscriptionUser(subscriptionId.Value);
            var result = new PaddleLinkReply { Link = subscriptionUser.UpdateUrl };
            return result;
        }

        [HttpPost("cancel")]
        public async Task Cancel()
        {
            var account = await GetLoggedInAccountAsync();
            var subscriptionId = account.PaddleSubscriptionId;

            if (subscriptionId == null)
            {
                throw new BadRequestException("You do not have a subscription.");
            }

            // Set the trial expiry to be the next payment date.
            var subscriptionUser = await _paddleClient.GetSubscriptionUser(subscriptionId.Value);
            
            if (subscriptionUser?.NextPayment != null)
            {
                var nextPaymentDate = subscriptionUser.NextPayment.Date;
                account.TrialExpiryUtc = DateTime.SpecifyKind(nextPaymentDate, DateTimeKind.Utc);
            }

            // Cancel the subscription.
            await _paddleClient.CancelSubscription(subscriptionId.Value);
            account.PaddleSubscriptionId = null;

            // Save.
            Db.Accounts.Update(account);
            await Db.SaveChangesAsync();
        }

        //===================== Private ========================
        private ITimeService _timeService;
        private IPaddleClient _paddleClient;
        private PaddlePassthroughSerializer _passthroughSerializer;
    }
}
