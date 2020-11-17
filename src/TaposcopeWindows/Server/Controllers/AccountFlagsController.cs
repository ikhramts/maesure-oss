using Common.Time;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Db;
using Server.Services.UserEvents;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/account-flags")]
    public class AccountFlagsController : AppControllerBase
    {
        public AccountFlagsController(MainDbContext db, 
                                      IUserEventsService userEventsService,
                                      ITimeService timeService)
            : base(db, userEventsService)
        {
            _timeService = timeService;
        }

        [HttpPost]
        public async Task<IActionResult> SetFlags([FromBody] Messages.AccountFlagSetRequest msg)
        {
            // Validate that the user is logged in.
            var account = await GetCurrentAccountAsync();

            if (account == null)
            {
                return Unauthorized();
            }

            // Validate the request
            if (msg.Flags == null || !msg.Flags.Any())
            {
                return BadRequest("Must provide at least one account flag to set");
            }
            
            foreach (var flag in msg.Flags)
            {
                var name = flag.Key;
                if (string.IsNullOrWhiteSpace(name))
                {
                    return BadRequest("Account flag name cannot be empty or whitespace. Was: '" + name + "'.");
                }

                if (name.Length > AccountFlag.MaxNameLength)
                {
                    return BadRequest("Account flag name cannot be longer than " +
                        AccountFlag.MaxNameLength + " characters. Was: " + name.Length + " characters, '" +
                        name + "'.");
                }
            }

            // Edit/change the flags as needed.
            var accountId = account.Id;
            var flags = await Db.AccountFlags.Where(f => f.AccountId == accountId).ToListAsync();
            var flagsByName = flags.ToDictionary(flag => flag.Name);

            foreach (var flagToSet in msg.Flags)
            {
                var found = flagsByName.TryGetValue(flagToSet.Key, out var flagToChange);

                if (found)
                {
                    // Update existing flag.
                    flagToChange.Value = flagToSet.Value;
                    flagToChange.LastChangedTimeUtc = _timeService.UtcNow;
                    Db.AccountFlags.Update(flagToChange);
                }
                else
                {
                    // Add a new flag.
                    var newFlag = new AccountFlag
                    {
                        Id = Guid.NewGuid(),
                        AccountId = accountId,
                        Name = flagToSet.Key,
                        Value = flagToSet.Value,
                        LastChangedTimeUtc = _timeService.UtcNow
                    };

                    Db.AccountFlags.Add(newFlag);
                }
            }

            await Db.SaveChangesAsync();
            
            return NoContent();
        }

        // ====================== Private ======================
        private ITimeService _timeService;
    }
}
