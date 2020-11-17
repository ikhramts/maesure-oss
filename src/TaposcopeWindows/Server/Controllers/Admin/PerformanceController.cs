using Microsoft.AspNetCore.Mvc;
using Server.Db;
using Server.Services.UserEvents;
using System;
using System.Threading.Tasks;

namespace Server.Controllers.Admin
{
    [Route("api/admin/performance")]
    [ApiController]
    public class PerformanceController : AppControllerBase
    {
        public PerformanceController(MainDbContext db, IUserEventsService userEventsService) : base(db, userEventsService)
        {
        }

        [HttpGet("run-gc")]
        public async Task<IActionResult> RunGc()
        {
            var account = await GetCurrentAccountAsync();

            if (account == null || 
                !(account.Id == new Guid("c7fd4b8b-17d0-4645-a1c3-04d0c998dfd7") || // These are hard-coded admin accounts.
                  account.Id == new Guid("a22968fd-9bac-4f06-b7bf-8e608c5790d9")))  // They no longer exist. You'll need to use different ones.
            {
                return NotFound();
            }

            GC.Collect();
            return Ok();
        }
    }
}
