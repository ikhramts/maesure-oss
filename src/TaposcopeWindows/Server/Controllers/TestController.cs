using Microsoft.AspNetCore.Mvc;
using Server.Middleware.StatusCodeExceptions;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/test")]
    public class TestController : ControllerBase
    {
        [HttpGet("throw-400")]
        public IActionResult Throw400()
        {
            throw new BadRequestException("Bad!");
        }

        [HttpGet("throw-401")]
        public IActionResult Throw401()
        {
            throw new UnauthorizedException();
        }

        [HttpGet("throw-404")]
        public IActionResult Throw404()
        {
            throw new NotFoundException();
        }
    }
}
