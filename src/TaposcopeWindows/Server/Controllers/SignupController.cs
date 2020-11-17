using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Server.Controllers.Routing;
using Server.Db;
using Server.Services.Accounts;
using Server.Services.Auth0;
using Server.Services.UserEvents;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [Route("api/signup")]
    [ApiController]
    public class SignupController : AppControllerBase
    {
        public SignupController(MainDbContext db,
            IAuth0Client auth0Client,
            IAccountService accountService,
            ILogger<SignupController> log, 
            IUserEventsService userEventsService) 
            : base(db, userEventsService)
        {
            _log = log;
            _auth0Client = auth0Client;
            _accoutnService = accountService;
        }

        [HttpPost]
        public async Task<IActionResult> SignUp([FromBody] SignupMessage message)
        {
            // Create the user in Auth0.
            var dbConnectionUserId = await _auth0Client.Signup(message.Email, message.Password);
            var auth0UserId = "auth0|" + dbConnectionUserId;

            // Create the account in the DB and link it to the current session.
            var cookies = HttpContext.Request.Cookies;
            cookies.TryGetValue(PublicWebProxyController.VisitorSessionKey, out var sessionId);

            await _accoutnService.EnsureAccountEsists(Db, auth0UserId, sessionId);

            // Log the user in.
            var claims = new Claim[] {
                new Claim(ClaimTypes.NameIdentifier, auth0UserId),
                new Claim(ClaimTypes.Email, message.Email)
            };

            var claimsPrincipal = new ClaimsPrincipal(new ClaimsIdentity(claims, "AuthenticationTypes.Federation"));
            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, claimsPrincipal);

            return Ok();
        }

        [HttpGet("is-email-available/{email}")]
        public async Task<IActionResult> IsEmailAvailable(string email)
        {
            // Add a delay to prevent an attacker from trying all emails.
            await Task.Delay(200);

            // Do the actual work.
            var isEmailAvailable = await _auth0Client.IsEmailAvailable(email);

            if (isEmailAvailable)
            {
                return Ok();
            }
            else
            {
                return Conflict("Email is already taken by a user.");
            }
        }

        public class SignupMessage
        {
            public string Email { get; set; }
            public string Password { get; set; }
            public bool HasConfirmedTermsAndConditions { get; set; }
        }

        //==================== Private ====================
        ILogger<SignupController> _log;
        IAuth0Client _auth0Client;
        IAccountService _accoutnService;
    }
}
