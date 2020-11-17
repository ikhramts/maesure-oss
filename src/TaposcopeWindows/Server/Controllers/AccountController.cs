using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Server.Db;
using Server.Services.Auth0;
using Server.Services.Paddle;
using Server.Services.UserEvents;

namespace Server.Controllers
{
    [Route("api/account")]
    [ApiController]
    public class AccountController : AppControllerBase
    {
        public AccountController(MainDbContext db,      
                                 IAuth0Client auth0Client, 
                                 IUserEventsService userEventsService,
                                 IPaddleClient paddleClient,
                                 ILogger<AccountController> log) 
            : base(db, userEventsService)
        {
            _auth0Client = auth0Client;
            _paddleClient = paddleClient;
            _log = log;
        }

        [HttpPost("send-change-password-email/{email}")]
        public async Task<IActionResult> SendChangePasswordEmail(string email)
        {
            await _auth0Client.SendChangePasswordEmail(email);
            return Ok();
        }

        [HttpPost("delete")]
        public async Task Delete()
        {
            var account = await GetLoggedInAccountAsync();
            var auth0userId = account.Auth0UserId;

            // User tracking.
            await UserEventsService.RecordEvent(new UserEvent
            {
                Account = account,
                Category = "account",
                Name = "delete"
            });

            // Delete the user from Auth0.
            // Of all the steps in this process, this one is most likely to fail,
            // so we do it first.
            await _auth0Client.DeleteUser(auth0userId);

            // Cancel the Paddle subscription.
            var paddleSubscriptionId = Account.PaddleSubscriptionId;

            if (paddleSubscriptionId != null)
            {
                try
                {
                    await _paddleClient.CancelSubscription(paddleSubscriptionId.Value);
                    Account.PaddleSubscriptionId = null;
                }
                catch (Exception)
                {
                    _log.LogError($"Could not cancel Paddle subscription {paddleSubscriptionId} " +
                        $"for account {Account.Id}");
                }
            }

            // Mark the DB data for deletion.
            account.IsDeleted = true;
            account.Auth0UserId = "";

            Db.Accounts.Update(account);
            await Db.SaveChangesAsync();
        }

        // ==================== Private =====================
        private IAuth0Client _auth0Client;
        private IPaddleClient _paddleClient;
        private ILogger<AccountController> _log;
    }
}
