using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Server.Config;
using Server.Db;
using Server.Services.UserEvents;
using System;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Server.Controllers.Routing
{
    public class PublicWebProxyController : ControllerBase
    {
        public const string VisitorSessionKey = "visitor";

        public PublicWebProxyController(IHttpClientFactory httpClientFactory, 
            BackendRoutes backendRoutes, IUserEventsService userEventsService, ILogger<PublicWebProxyController> log)
        {
            _httpClientFactory = httpClientFactory;
            _backendRoutes = backendRoutes;
            _router = new Router(_backendRoutes);
            _userEventsService = userEventsService;
            _log = log;
        }

        [HttpGet]
        [HttpHead]
        public async Task Get()
        {
            var path = Request.Path.Value;

            if (Request.QueryString.HasValue)
            {
                // QueryString may or may not start with a '?'.
                path += "?" + Request.QueryString.Value.Replace("?", "");
            }

            // User tracking. Try not to block the rest of the request if possible.
            var visitorSessionId = GetVisitorSessionId();
            var recordUserVisitTask = RecordUserVisit(path, visitorSessionId);

            // Figure out where to forward the request.
            HttpMethod method = HttpMethod.Get;

            if (Request.Method == "HEAD")
                method = HttpMethod.Head;

            var isAuthenticated = User.Identity.IsAuthenticated;
            var routeResult = _router.Route(path, isAuthenticated);

            if (routeResult.ShouldChallenge)
            {
                await HttpContext.ChallengeAsync("Auth0", new AuthenticationProperties() { RedirectUri = path });
                return;
            }

            if (!string.IsNullOrEmpty(routeResult.RedirectTo))
            {
                Response.StatusCode = 302;
                Response.Headers["Location"] = routeResult.RedirectTo;
                return;
            }

            // Forward the request.
            var fwdRequest = new HttpRequestMessage(method, routeResult.BackendPath);
            //fwdRequest.Headers.Clear();

            foreach (var reqHeader in Request.Headers)
            {
                if (reqHeader.Key == "Host")
                    continue;

                fwdRequest.Headers.TryAddWithoutValidation(reqHeader.Key, reqHeader.Value.ToArray());
            }

            //Debug.WriteLine("============= Headers =================");

            //if (path.Contains("/download"))
            //{
            //    var headers = "HEADERS ";

            //    foreach (var header in fwdRequest.Headers)
            //    {
            //        headers += " | " + header.Key + ": " + header.Value;
            //    }

            //    _log.LogInformation(headers);
            //}

            var client = _httpClientFactory.CreateClient();
            var response = await client.SendAsync(fwdRequest);

            Response.StatusCode = (int)response.StatusCode;
            
            foreach (var header in response.Headers)
            {
                Response.Headers[header.Key] = header.Value.ToArray();
            }

            // Fix MIME types for some files.
            if (!response.Headers.Any(h => h.Key == "Content-Type"))
            {
                var requestPath = Request.Path.Value;

                if (requestPath.EndsWith(".js"))
                {
                    Response.Headers["Content-Type"] = "text/javascript";
                }
                else if(requestPath.EndsWith(".svg"))
                {
                    Response.Headers["Content-Type"] = "image/svg+xml";
                }
            }

            // Explicitly remove any cache for "/" path
            if (path == "/")
            {
                Response.Headers["Cache-Control"] = "no-cache";
                Response.Headers["Expires"] = "0";
                Response.Headers["Pragma"] = "no-cache";
            }

            SetVisitorSessionId(visitorSessionId);

            var backendStream = await response.Content.ReadAsStreamAsync();
            await backendStream.CopyToAsync(Response.Body);
            await recordUserVisitTask;
        }

        // =============== Private =======================
        IHttpClientFactory _httpClientFactory;
        BackendRoutes _backendRoutes;
        Router _router;
        IUserEventsService _userEventsService;
        ILogger<PublicWebProxyController> _log;


        private string GetVisitorSessionId()
        {
            var found = Request.Cookies.TryGetValue(VisitorSessionKey, out var sessionId);

            if (found)
            {
                return sessionId;
            }
            else
            {
                return Guid.NewGuid().ToString();
            }
        }

        private void SetVisitorSessionId(string visitorSessionId)
        {
            if (!Request.Cookies.ContainsKey(VisitorSessionKey))
            {
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.None,
                    IsEssential = true, //TODO: fix for GDPR/general good behaviour
                    Path = "/"
                };

                Response.Cookies.Append(VisitorSessionKey, visitorSessionId, cookieOptions);
            }
        }

        private async Task RecordUserVisit(string path, string visitorSessionId)
        {
            // Don't record asset file loads; they're just noise.
            var isFile = Regex.IsMatch(path, "\\.[^/]+$");

            if (isFile)
            {
                return;
            }

            // We're interested only in humans who came to learn about us or sign up.
            if (!IsPerson())
            {
                return;
            }
            
            // Record the visit.
            Account account = null;

            if (User.Identity.IsAuthenticated)
            {
                var auth0UserId = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier).Value;
                account = new Account { Auth0UserId = auth0UserId };
            }

            await _userEventsService.RecordEvent(new UserEvent
            {
                Account = account,
                SessionId = visitorSessionId,
                Category = "page",
                Name = "load",
                Value = path
            });
        }

        private bool IsPerson()
        {
            // Exclude crawlers.
            var foundUserAgent = Request.Headers.TryGetValue("User-agent", out var userAgentRaw);

            if (!foundUserAgent)
            {
                // Probably not a real person.
                return false;
            }

            var userAgent = userAgentRaw.First().ToLower();

            // Google bots
            if (userAgent.Contains("googlebot")
                || userAgent.Contains("mediapartners-google")
                || userAgent.Contains("adsbot-google"))
            {
                return false;
            }

            // Other bots
            if (userAgent.Contains("bingbot")
                || userAgent.Contains("slurp") // Yahoo
                || userAgent.Contains("duckduckbot") // DuckDuckGo
                || userAgent.Contains("baiduspider") // Baidu
                || userAgent.Contains("yandexbot") // Yandex
                || userAgent.Contains("sogou") // Sogou
                || userAgent.Contains("exabot") // Exalead
                || userAgent.Contains("facebot") // Facebook
                || userAgent.Contains("facebookexternalhit") // Facebook
                || userAgent.Contains("ia_archiver") // Alexa
                )
            {
                return false;
            }

            // Tools - these are real people, but 
            // they didn't come here to sign up or learn about us.
            if (userAgent.Contains("postman")
                || userAgent.Contains("insomnia")
                )
            {
                return false;
            }

            return true;
        }
    }
}
