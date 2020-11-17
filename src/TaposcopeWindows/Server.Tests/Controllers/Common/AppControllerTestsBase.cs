using Common.Time;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Server.Controllers.Routing;
using Server.Db;
using Server.Services.UserEvents;
using Server.Tests.Mocks;
using System;
using System.Collections.Generic;
using System.Security.Claims;

namespace Server.Tests.Controllers.Common
{
    public abstract class AppControllerTestsBase
    {
        protected MockMainDbContext Db = new MockMainDbContext();
        protected MockTimeService TimeService = new MockTimeService();
        protected NullUserEventsService UserEventsService = new NullUserEventsService();

        protected Guid DefaultPollId = new Guid("027b1871-bbfe-4116-a872-86a64e6c0679");
        protected Guid TestAccountId = new Guid("c8503229-7c69-46e2-a03a-14b32762be76");
        protected string Auth0UserId = "auth0|abcd";
        protected string TestEmail = "abcd@efg.com";

        protected Account TestAccount;
        protected Poll DefaultPoll;

        protected AppControllerTestsBase()
        {
            // Create some mock data.
            TestAccount = new Account { Auth0UserId = Auth0UserId, Id = TestAccountId, IsDeleted = false };
            Db.Mock.Accounts.QueryData.Add(TestAccount);

            DefaultPoll = new Poll { AccountId = TestAccountId, Id = DefaultPollId, IsActive = true, WasStarted = false };
            Db.Mock.Polls.QueryData.Add(DefaultPoll);
        }

        protected void SetUpLoggedInUser(ControllerBase controllerBase, IDictionary<string, string> additionalClaims = null)
        {
            var claims = new List<Claim> {
                new Claim(ClaimTypes.NameIdentifier, Auth0UserId),
                new Claim(ClaimTypes.Email, TestEmail),
            };

            if (additionalClaims != null)
            {
                foreach (var kv in additionalClaims)
                {
                    claims.Add(new Claim(kv.Key, kv.Value));
                }
            }

            var claimsPrincipal = new ClaimsPrincipal(new ClaimsIdentity(claims, "AuthenticationTypes.Federation"));

            var mockHttpContext = new Mock<HttpContext>();
            mockHttpContext.SetupProperty(c => c.User, claimsPrincipal);

            if (controllerBase.ControllerContext.HttpContext == null)
            {
                controllerBase.ControllerContext.HttpContext = new DefaultHttpContext();
            }

            controllerBase.ControllerContext.HttpContext.User = claimsPrincipal;
        }

        protected void SetUpAnonymousUser(ControllerBase controllerBase)
        {
            var claimsPrincipal = new ClaimsPrincipal(new ClaimsIdentity());

            var mockHttpContext = new Mock<HttpContext>();
            mockHttpContext.SetupProperty(c => c.User, claimsPrincipal);

            if (controllerBase.ControllerContext.HttpContext == null)
            {
                controllerBase.ControllerContext.HttpContext = new DefaultHttpContext();
            }

            controllerBase.ControllerContext.HttpContext.User = claimsPrincipal;
        }

        protected void SetUpAnonymousUserWithVisitorCookie(ControllerBase controllerBase)
        {
            SetUpAnonymousUser(controllerBase);
            AddCookie(controllerBase, PublicWebProxyController.VisitorSessionKey, "abcd");
        }

        protected void SetupTempUser(ControllerBase controllerBase)
        {
            // A temp user is an anonymous user who has a session cookie that's
            // linked to an account in DB.
            SetUpAnonymousUser(controllerBase);

            // Set up session cookie
            var sessionId = "abcd";
            AddCookie(controllerBase, PublicWebProxyController.VisitorSessionKey, sessionId);

            // Set up the account.
            Db.Mock.Accounts.QueryData.Clear();
            Db.Mock.Accounts.QueryData.Add(new Account
            {
                Id = TestAccountId,
                TempAccountSessionId = sessionId,
                Auth0UserId = ""
            });
        }

        protected void AddCookie(ControllerBase controllerBase, string key, string value)
        {
            if (controllerBase.ControllerContext.HttpContext == null)
            {
                controllerBase.ControllerContext.HttpContext = new DefaultHttpContext();
            }

            var cookieCollection = controllerBase.Request.Cookies as MockRequestCookieCollection;

            if (cookieCollection == null)
            {
                // We will have to edit this cookieCollection before adding it.
                // Otherwise Request.Cookies will ignore our changes.
                cookieCollection = new MockRequestCookieCollection();
            }

            cookieCollection[key] = value;

            var httpContext = (DefaultHttpContext)controllerBase.ControllerContext.HttpContext;
            httpContext.Request.Cookies = cookieCollection;
        }

        protected TimeLogEntry InsertTimeLogEntry(string entryText, DateTime fromTime, Guid pollId = default)
        {
            return InsertTimeLogEntry(entryText, fromTime, fromTime + TimeSpan.FromMinutes(5), pollId);
        }

        protected TimeLogEntry InsertTimeLogEntry(string entryText, DateTime fromTime, DateTime toTime, Guid pollId = default)
        {
            var pollIdToUse = (pollId == default) ? DefaultPollId : pollId;

            var entry = new TimeLogEntry
            {
                Id = Guid.NewGuid(),
                PollId = pollIdToUse,
                EntryText = entryText,
                FromTime = fromTime,
                ToTime = toTime,

                TimeZone = "Some time zone",
                TimeZoneOffset = TimeSpan.FromHours(-2),

                CreatedTimeUtc = fromTime.AddSeconds(3),
            };

            Db.Mock.TimeLogEntries.QueryData.Add(entry);
            return entry;
        }

        protected TimeLogEntry InsertUndoTimeLogEntry(TimeLogEntry entry)
        {
            var undoEntry = entry.CopyAndChangeId();
            undoEntry.UndoTarget = entry.Id;
            undoEntry.CreatedTimeUtc = entry.CreatedTimeUtc.AddSeconds(3);

            Db.Mock.TimeLogEntries.QueryData.Add(undoEntry);
            return undoEntry;
        }

        protected ActivityGroup InsertActivityGroup(string name, Guid? parentId = null, string matchResponseText = null)
        {
            var activityGroup = new ActivityGroup
            {
                Id = Guid.NewGuid(),
                ParentId = parentId,
                Name = name,
                MatchResponseText = matchResponseText,
                PollId = DefaultPollId,
                Position = 0
            };

            Db.Mock.ActivityGroups.QueryData.Add(activityGroup);

            return activityGroup;
        }

        protected Account InsertAccount(string name = null)
        {
            var account = new Account
            {
                Id = Guid.NewGuid(),
                Name = name
            };

            Db.Mock.Accounts.QueryData.Add(account);
            return account;
        }

        protected Poll InsertPoll(string name, Guid? accountId = null)
        {
            var accountIdToUse = accountId == null ? TestAccountId : accountId.Value;

            var poll = new Poll
            {
                Id = Guid.NewGuid(),
                AccountId = accountIdToUse,
                Name = name
            };

            Db.Mock.Polls.QueryData.Add(poll);
            return poll;
        }
    }
}
