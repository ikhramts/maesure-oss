using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Services.Auth0;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [Route("api/auth")]
    public class AuthController : Controller
    {
        public AuthController(IAuth0Client auth0Client)
        {
            _auth0Client = auth0Client;
        }

        [HttpGet("login")]
        public async Task Login(string returnUrl = "/")
        {
            await HttpContext.ChallengeAsync("Auth0", new AuthenticationProperties() { RedirectUri = returnUrl });
        }

        [HttpGet("login-with-google")]
        public async Task LoginWithGoogle(string returnUrl = "/")
        {
            var properties = new AuthenticationProperties { RedirectUri = returnUrl };
            properties.SetString("connection", "google-oauth2");
            await HttpContext.ChallengeAsync("Auth0", properties);
        }

        [Authorize]
        [HttpGet("logout")]
        public async Task Logout()
        {
            await HttpContext.SignOutAsync("Auth0", new AuthenticationProperties
            {
                // Indicate here where Auth0 should redirect the user after a logout.
                // Note that the resulting absolute Uri must be whitelisted in the
                // **Allowed Logout URLs** settings for the app.

                // Actually, we'll fall back to the default.
                RedirectUri = "/"
            });
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }

        //============================================================
        private IAuth0Client _auth0Client;
    }
}
