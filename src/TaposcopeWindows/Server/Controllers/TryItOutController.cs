using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Controllers.Routing;
using Server.Db;
using Server.Services.UserEvents;
using System;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [ApiController]
    [Route("/api/try-it-out")]
    public class TryItOutController : AppControllerBase
    {
        public TryItOutController(MainDbContext db, IUserEventsService userEventsService) 
            : base(db, userEventsService)
        {
        }

        [HttpPost("create-temp-account")]
        public async Task<IActionResult> CreateTempAccount()
        {
            // 1. Check whether the account exists
            // 2. Create account
            // 3. Create the poll
            // 4. Return

            // Check whether the user is already logged in. 
            if (IsUserLoggedIn())
                throw new Exception("Cannot create a temporary account because the user already has a permanent account.");

            // Check if the account exists.
            var found = Request.Cookies.TryGetValue(PublicWebProxyController.VisitorSessionKey, out var sessionId);

            if (!found)
                throw new Exception($"Could not find cookie '{PublicWebProxyController.VisitorSessionKey}'");

            var existingAccount =
                await Db.Accounts.FirstOrDefaultAsync(a => a.TempAccountSessionId == sessionId && a.IsDeleted == false);

            if (existingAccount != null)
            {
                return BadRequest($"Account for sessionId={sessionId} already exists");
            }

            // Create the Account object in DB.
            // On error we just crash for now.
            var newAccount = new Account
            {
                Id = Guid.NewGuid(),
                Name = "User",
                Auth0UserId = "",
                TempAccountSessionId = sessionId
            };
            Db.Accounts.Add(newAccount);
            await Db.SaveChangesAsync();

            // Create a poll for the user.
            var poll = new Poll
            {
                Id = Guid.NewGuid(),
                AccountId = newAccount.Id,
                Name = "User poll",
                ActiveFrom = TimeSpan.FromHours(0),
                ActiveTo = TimeSpan.FromHours(24),
                IsActive = true,
                DesiredFrequency = GlobalSettings.StartingFrequencyMin,
                PollType = Messages.PollType.OpenText,
                WasStarted = true,
                StartedAt = DateTime.UtcNow
            };

            Db.Polls.Add(poll);
            await Db.SaveChangesAsync();

            // Prepare the final result.
            var msgPoll = new Messages.PollMsg
            {
                Id = poll.Id,
                IsActive = poll.IsActive,
                DesiredFrequency = poll.DesiredFrequency,
                WasStarted = poll.WasStarted,
                StartedAt = poll.StartedAt
            };

            var result = new Messages.CreateTempAccountResult
            {
                User = new Messages.UserReply
                {
                    AccountType = Messages.AccountType.Temporary,
                },
                DefaultPoll = msgPoll
            };

            // User event tracking.
            await UserEventsService.RecordEvent(new UserEvent
            {
                Account = newAccount,
                Category = "temp_account",
                Name = "create"
            });

            return Ok(result);
        }

        [HttpGet("forget-me")]
        public IActionResult ForgetMe()
        {
            foreach (var cookie in Request.Cookies.Keys)
            {
                Response.Cookies.Delete(cookie);
            }

            return Redirect("/");
        }

        // ================== Private ==================
    }
}
