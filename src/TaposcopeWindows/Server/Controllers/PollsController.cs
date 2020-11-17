using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.UserEvents;
using System;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [Route("api/polls")]
    [ApiController]
    public class PollsController : AppControllerBase
    {
        public PollsController(MainDbContext db, ILogger<PollsController> log, IUserEventsService userEventsService)
            : base(db, userEventsService)
        {
            _log = log;
        }

        [HttpGet("/api/poll")]
        public async Task<IActionResult> Get()
        {
            // This endpoint has to work when the user is not logged in.
            try {
                var poll = await GetDefaultPollAsync();
                return Ok(poll);
            }
            catch (UnauthorizedException)
            {
                return Ok(null);
            }
        }

        /// <summary>
        /// Updates the user's default poll.
        /// </summary>
        /// <param name="poll"></param>
        /// <returns></returns>
        [HttpPost("/api/poll")]
        public async Task<IActionResult> Update([FromBody] Messages.PollUpdateRequest request)
        {
            var newActiveFrom = request.ActiveFrom;
            var newActiveTo = request.ActiveTo;
            var newDesiredFrequencyMin = request.DesiredFrequencyMin;
            var newWasStarted = request.WasStarted;
            var newStartedAt = request.StartedAt;

            // Basic validation.
            if (newActiveFrom.HasValue && newActiveTo.HasValue
                && newActiveFrom.Value > newActiveTo.Value)
            {
                return BadRequest("'activeFrom' cannot be after 'activeTo'");
            }

            var oneDay = TimeSpan.FromDays(1);

            if (newActiveFrom != null && (newActiveFrom < TimeSpan.Zero || newActiveFrom > oneDay))
            {
                return BadRequest("'activeFrom' must be between zero and 24 hours");
            }

            if (newActiveTo != null && (newActiveTo < TimeSpan.Zero || newActiveTo > oneDay))
            {
                return BadRequest("'activeTo' must be between zero and 24 hours");
            }

            if (newDesiredFrequencyMin != null && 
                (newDesiredFrequencyMin <= 0 || newDesiredFrequencyMin > Poll.MaxDesiredFrequencyMin))
            {
                return BadRequest($"'desiredFrequencyMin' must be between 1 and {Poll.MaxDesiredFrequencyMin}");
            }

            if (newWasStarted != null && newWasStarted.Value == true
                && newStartedAt == null)
            {
                return BadRequest("When starting a poll, must provide 'startedAt'");
            }

            // Data validation.
            var poll = await GetDefaultPollAsync();

            if (poll == null)
            {
                return Unauthorized();
            }

            if (newActiveFrom != null)
            {
                if (newActiveTo == null && newActiveFrom > poll.ActiveTo)
                {
                    return BadRequest("New 'activeFrom' value will be after the existing 'activeTo' value.");
                }

                poll.ActiveFrom = newActiveFrom.Value;
            }

            if (newActiveTo != null)
            {
                if (newActiveFrom == null && newActiveTo < poll.ActiveFrom)
                {
                    return BadRequest("New 'activeTo' value will be before the existing 'activeFrom' value.");
                }

                poll.ActiveTo = newActiveTo.Value;
            }

            if (newDesiredFrequencyMin != null)
            {
                poll.DesiredFrequency = TimeSpan.FromMinutes(newDesiredFrequencyMin.Value);
            }

            if (newWasStarted != null)
            {
                poll.WasStarted = newWasStarted.Value;

                if (poll.WasStarted)
                {
                    poll.StartedAt = DateTime.SpecifyKind(newStartedAt.Value, DateTimeKind.Unspecified);
                }
                else
                {
                    poll.StartedAt = null;
                }

            }

            await Db.SaveChangesAsync();

            return NoContent();
        }


        //=================== Private ===========================
        private ILogger<PollsController> _log;
    }
}
