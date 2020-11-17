using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Server.Db;
using Server.Services.Auth0;
using Server.Services.UserEvents;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [Route("api/delete-account")]
    [ApiController]
    public class DeleteAccountController : AppControllerBase
    {
        public DeleteAccountController(MainDbContext db,
            IAuth0Client auth0Client,
            ILogger<DeleteAccountController> log, 
            IUserEventsService userEventsService) 
            : base(db, userEventsService)
        {
            _log = log;
            _auth0Client = auth0Client;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Post()
        {
            var account = await GetCurrentAccountAsync();
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

            // Mark the DB data for deletion.
            account.IsDeleted = true;
            account.Auth0UserId = "";

            Db.Accounts.Update(account);
            await Db.SaveChangesAsync();

            return Ok();
        }

        // ======================== Private ===============================
        private IAuth0Client _auth0Client;
        private ILogger<DeleteAccountController> _log;
    }
}
