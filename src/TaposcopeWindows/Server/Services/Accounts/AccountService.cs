using System;
using System.Threading.Tasks;
using Common.Time;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Server.Db;
using Server.Services.UserEvents;

namespace Server.Services.Accounts
{
    public class AccountService : IAccountService
    {
        public AccountService(IUserEventsService userEventsService, ILoggerFactory loggerFactory, ITimeService timeService)
        {
            _userEventsService = userEventsService;
            _log = loggerFactory.CreateLogger<AccountService>();
            _timeService = timeService;
        }

        public async Task<Account> EnsureAccountEsists(MainDbContext db, string auth0UserId, string tempAccountSessionId)
        {
            // Check if the account already exists.
            var existingAccount =
                await db.Accounts.FirstOrDefaultAsync(a => a.Auth0UserId == auth0UserId && a.IsDeleted == false);

            if (existingAccount != null)
            {
                return existingAccount;
            }

            // Check whether there's an account for tempAccountSessionId.
            // If it does, associate this auth0 user with it.
            var trialPeriodExpiry = _timeService.UtcNow.AddDays(SubscriptionPlan.TrialPeriodDays);

            if (tempAccountSessionId != null)
            {
                var tempAccount =
                    await db.Accounts.FirstOrDefaultAsync(a => a.TempAccountSessionId == tempAccountSessionId 
                                                                && a.IsDeleted == false);
                if (tempAccount != null)
                {
                    tempAccount.Auth0UserId = auth0UserId;

                    // Clean up the old, less secure way to access the account.
                    tempAccount.TempAccountSessionId = null;
                    //tempAccount.TrialExpiryUtc = trialPeriodExpiry;

                    db.Accounts.Update(tempAccount);
                    await db.SaveChangesAsync();

                    // User event tracking.
                    await _userEventsService.RecordEvent(new UserEvent
                    {
                        Account = tempAccount,
                        Category = "account",
                        Name = "convert_to_permanent"
                    });

                    _log.LogInformation($"Upgraded temp account for '{auth0UserId}'");
                    return tempAccount;
                }
            }

            // Create the Account object in DB.
            // On error we just crash for now.
            var newAccount = new Account
            {
                Id = Guid.NewGuid(),
                Name = "User",
                Auth0UserId = auth0UserId,
                //TrialExpiryUtc = trialPeriodExpiry
            };

            db.Accounts.Add(newAccount);
            await db.SaveChangesAsync();

            // Create a poll for the user.
            var poll = new Poll
            {
                Id = Guid.NewGuid(),
                AccountId = newAccount.Id,
                Name = "User poll",
                ActiveFrom = TimeSpan.FromHours(6),
                ActiveTo = TimeSpan.FromHours(18),
                IsActive = true,
                DesiredFrequency = GlobalSettings.StartingFrequencyMin,
                PollType = Messages.PollType.OpenText
            };

            db.Polls.Add(poll);
            await db.SaveChangesAsync();

            // User event tracking.
            await _userEventsService.RecordEvent(new UserEvent
            {
                Account = newAccount,
                Category = "account",
                Name = "create"
            });

            _log.LogInformation($"Created new account for '{auth0UserId}'");
            return newAccount;
        }

        //=================== Private ========================
        private IUserEventsService _userEventsService;
        private ILogger<AccountService> _log;
        private ITimeService _timeService;
    }
}
