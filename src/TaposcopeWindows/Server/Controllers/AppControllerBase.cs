using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using Server.Controllers.Routing;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Accounts;
using Server.Services.UserEvents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace Server.Controllers
{
    public abstract class AppControllerBase : ControllerBase
    {
        public MainDbContext Db { get; private set; }
        public Account Account { get; private set; }
        public IUserEventsService UserEventsService  { get; private set;}

        protected AppControllerBase(MainDbContext db, IUserEventsService userEventsService)
        {
            Db = db;
            UserEventsService = userEventsService;
        }

        protected string GetLoggedInUserEmail()
        {
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email).Value;
                return email;
            }

            throw new UnauthorizedException();
        }

        protected async Task<Account> GetCurrentAccountAsync()
        {
            if (Account != null)
                return Account;

            // Check if the user is logged in.
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                // Can return the permanent account.
                var auth0Id = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier).Value;

                // By this point, the login process in Startup.cs should have ensured that the
                // Account object was created for the user.
                //var account = await _accountService.GetOrCreateForAuth0UserId(auth0Id);
                var account = await Db.Accounts.FirstOrDefaultAsync(a => a.Auth0UserId == auth0Id);

                if (account == null)
                {
                    throw new Exception($"Could not find an account for user {auth0Id}");
                }

                Account = account;
                return account;
            }

            // Check if this session is associated with a temporary account.
            var foundCookie = Request.Cookies.TryGetValue(PublicWebProxyController.VisitorSessionKey, out var sessionId);

            if (foundCookie)
            {
                var account = await Db.Accounts.FirstOrDefaultAsync(a => a.TempAccountSessionId == sessionId);

                Account = account;
                return account;
            }

            return null;
        }

        protected async Task<Account> GetLoggedInAccountAsync()
        {
            if (User == null || User.Identity == null || !User.Identity.IsAuthenticated)
            {
                throw new UnauthorizedException();
            }

            var auth0Id = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier).Value;

            if (auth0Id == null)
            {
                throw new UnauthorizedException();
            }

            return await GetCurrentAccountAsync();
        }

        protected bool IsUserLoggedIn()
        {
            if (Account != null)
                return true;

            if (User.Identity.IsAuthenticated)
                return true;

            return false;
        }

        protected async Task<Poll> GetDefaultPollAsync()
        {
            var account = await GetCurrentAccountAsync();

            if (account == null)
            {
                throw new UnauthorizedException();
            }

            var poll = await Db.Polls.Where(p => p.AccountId == account.Id && p.IsActive == true).FirstOrDefaultAsync();
            if (poll == null)
            {
                // TODO: this should return 400
                throw new Exception("You do not have any active polls");
            }

            return poll;
        }

        protected static async Task<HttpResponseMessage> Post(string url, object request, IDictionary<string, string> headers = null)
        {
            var json = JsonConvert.SerializeObject(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            if (headers != null)
            {
                foreach (var header in headers)
                {
                    content.Headers.Add(header.Key, header.Value);
                }
            }

            var httpClient = new HttpClient();
            return await httpClient.PostAsync(url, content);
        }

        protected static async Task<HttpResponseMessage> Delete(string url, IDictionary<string, string> headers = null)
        {
            var httpClient = new HttpClient();

            if (headers != null)
            {
                foreach (var header in headers)
                {
                    httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);
                }
            }

            return await httpClient.DeleteAsync(url);
        }

        protected static async Task<T> GetReplyBody<T>(HttpResponseMessage reply) where T : class
        {
            var message = await reply.Content.ReadAsStringAsync();
            var replyBody = JsonConvert.DeserializeObject<T>(message);
            return replyBody;
        }

        // ================ Private =======================

    }
}
