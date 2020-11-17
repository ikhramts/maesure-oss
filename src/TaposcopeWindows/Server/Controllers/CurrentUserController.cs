using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Common.Time;
using Messages;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Server.Db;
using Server.Services.UserEvents;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/current-user")]
    public class CurrentUserController : AppControllerBase
    {
        public CurrentUserController(MainDbContext db, 
                                     IUserEventsService userEventsService, 
                                     ILogger<CurrentUserController> log,
                                     ITimeService timeService) 
            : base(db, userEventsService)
        {
            _log = log;
            _timeService = timeService;
        }

        [HttpGet]
        public async Task<UserReply> Get()
        {
            var user = new UserReply();

            // Check whether the user is logged in.
            if (User.Identity.IsAuthenticated)
            {
                // Get the email.
                var claims = User.Claims;
                var emailClaim = claims.FirstOrDefault(c => c.Type == ClaimTypes.Email);
                var email = emailClaim.Value;
                user.Email = email;

                // Get the picture.
                var picture = claims.FirstOrDefault(c => c.Type == "picture");

                if (picture != null && !string.IsNullOrWhiteSpace(picture.Value))
                {
                    user.Picture = picture.Value;
                }

                // Get the account provider.
                var auth0Id = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier).Value;
                user.AccountProvider = GetAccountProvider(auth0Id);
            }

            // Check whether there is a temporary account associated with this session.
            var account = await GetCurrentAccountAsync();

            if (account != null)
            {
                // The user has an account here.
                user.AccountType = GetAccountType(account);
                user.TrialExpiryUtc = account.TrialExpiryUtc;
                user.RemainingTrialDays = CalcRemainingTrialDays(account);
                var accountFlags = await Db.AccountFlags.Where(f => f.AccountId == account.Id).ToListAsync();

                foreach (var flag in accountFlags)
                {
                    user.Flags[flag.Name] = flag.Value;
                }
                
                return user;
            }

            return new UserReply { AccountType = AccountType.None };
        }

        // ==================== Private ==========================
        ILogger<CurrentUserController> _log;
        ITimeService _timeService;

        private AccountProvider GetAccountProvider(string auth0Id)
        {
            if (string.IsNullOrEmpty(auth0Id))
            {
                // This is not supposed to happen.
                // Degrade gracefully anyway.
                _log.LogError("Logged in user did not have auth0UserId.");
                return AccountProvider.None;
            }
            else if (auth0Id.StartsWith("auth0|"))
            {
                return AccountProvider.UsernamePassword;
            }
            else if (auth0Id.StartsWith("google-oauth2|"))
            {
                return AccountProvider.Google;
            }
            else
            {
                var providerEnd = auth0Id.IndexOf('|');

                if (providerEnd < 0)
                {
                    _log.LogError($"Auth0 user id '{auth0Id}' did not have a provider part.");
                }
                else
                {
                    var provider = auth0Id.Substring(0, providerEnd);
                    _log.LogError($"Unknown AccountProvider: {provider}.");
                }
                return AccountProvider.None;
            }
        }

        private AccountType GetAccountType(Account account)
        {
            if (!User.Identity.IsAuthenticated || string.IsNullOrEmpty(account.Auth0UserId))
            {
                return AccountType.Temporary;
            }

            if (account.PaddleSubscriptionId != null)
            {
                return AccountType.Pro;
            }

            if (account.TrialExpiryUtc != null)
            {
                if (account.TrialExpiryUtc.Value < _timeService.UtcNow)
                {
                    return AccountType.ProTrialExpired;
                }
                else
                {
                    return AccountType.ProTrial;
                }
            }

            return AccountType.FreePermanent;
        }

        private int CalcRemainingTrialDays(Account account)
        {
            if (account.PaddleSubscriptionId != null)
            {
                return 0;
            }

            var trialExpiryUtc = account.TrialExpiryUtc;
            
            if (trialExpiryUtc == null)
            {
                return 0;
            }

            var utcNow = _timeService.UtcNow;
            var remainingDays = (int)Math.Floor((trialExpiryUtc.Value - utcNow).TotalDays + 1);
            return Math.Max(remainingDays, 0);
        }

    }
}
