using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Common.Time;
using Messages;
using Microsoft.AspNetCore.Mvc;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.UserEvents;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/client-checkin")]
    public class ClientCheckinController : AppControllerBase
    {
        public ClientCheckinController(MainDbContext db, IUserEventsService userEventsService, ITimeService timeService) 
            : base(db, userEventsService)
        {
            _timeService = timeService;
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] ClientCheckinRequest req)
        {
            var account = await GetCurrentAccountAsync();

            if (account == null)
            {
                throw new UnauthorizedException();
            }

            if (req.ClientType == null)
            {
                throw new BadRequestException("must provide clientType");
            }

            if (req.ClientType == null)
            {
                throw new BadRequestException("must provide clientVersion");
            }

            var clientCheckin = new ClientCheckin
            {
                Id = Guid.NewGuid(),
                AccountId = account.Id,
                TimestampUtc = _timeService.UtcNow,
                ClientType = req.ClientType,
                ClientVersion = req.ClientVersion
            };

            Db.ClientCheckins.Add(clientCheckin);
            await Db.SaveChangesAsync();
            return NoContent();
        }

        // =========================== Private =========================
        ITimeService _timeService;
    }
}
