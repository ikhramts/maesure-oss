using Common.Http;
using Common.Logging;
using Common.Time;
using Google.Cloud.Diagnostics.AspNetCore;
using Google.Cloud.Diagnostics.Common;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using Server.Config;
using Server.Controllers.Routing;
using Server.Db;
using Server.Middleware.StatusCodeExceptions;
using Server.Services.Accounts;
using Server.Services.Auth0;
using Server.Services.Paddle;
using Server.Services.TimeLog;
using Server.Services.UserEvents;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Server
{
    public class Startup
    {
        public IConfiguration Configuration { get; }
        public IHostingEnvironment Environment { get; }
        public ILoggerFactory LoggerFactory { get; set; }

        public Startup(IConfiguration configuration, 
            IHostingEnvironment environment, ILoggerFactory loggerFactory)
        {
            Configuration = configuration;
            Environment = environment;
            LoggerFactory = loggerFactory;
            _log = loggerFactory.CreateLogger<Startup>();
        }

        // This method gets called by the runtime. Use this method to add services 
        // to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Basic config
            services.AddSingleton(Configuration);
            services.AddOptions();

            var backendRoutes = new BackendRoutes();
            Configuration.GetSection("BackendRoutes").Bind(backendRoutes);
            services.AddSingleton(backendRoutes);

            var stackdriverOptions = new StackdriverOptions();
            Configuration.Bind("Stackdriver", stackdriverOptions);
            services.AddSingleton(stackdriverOptions);

            // Set up the shared DataProtection keystorage when running on Google Cloud.
            if (!Environment.IsDevelopment())
            {
                services.AddDataProtection()
                // Store keys in Cloud Storage so that multiple instances
                // of the web application see the same keys.
                .PersistKeysToGoogleCloudStorage(
                    Configuration["DataProtection:Bucket"],
                    Configuration["DataProtection:Object"])
                // Protect the keys with Google KMS for encryption and fine-
                // grained access control.
                .ProtectKeysWithGoogleKms(
                    Configuration["DataProtection:KmsKeyName"]);
            }

            // Set up user event tracking.
            IUserEventsService userEventsService;
            if (!Environment.IsDevelopment())
            {
                userEventsService = new UserEventsService(stackdriverOptions);
            }
            else
            {
                userEventsService = new NullUserEventsService();
            }

            services.AddSingleton(userEventsService);

            // App services
            var restClient = new RestClient();
            services.AddSingleton<IRestClient>(restClient);

            var timerFactory = new SystemTimerFactory(new NullLogger()); // Use NullLogger until we get problems.
            services.AddSingleton<ITimerFactory>(timerFactory);

            var timeService = new SystemTimeService();
            services.AddSingleton<ITimeService>(timeService);

            var tokenService = new Auth0TokenService(restClient, 
                                                     timerFactory, 
                                                     LoggerFactory.CreateLogger<Auth0TokenService>());
            var auth0Client = new Auth0Client(tokenService, restClient);
            services.AddSingleton<IAuth0Client>(auth0Client);

            _accountService = new AccountService(userEventsService, LoggerFactory, timeService);
            services.AddSingleton(_accountService);

            var timeLogServie = new TimeLogService(timeService, userEventsService);
            services.AddSingleton<ITimeLogService>(timeLogServie);

            // Paddle config.
            var paddleClient = new PaddleClient(Configuration["Paddle:VendorId"],
                                                Configuration["Paddle:VendorAuthCode"],
                                                restClient,
                                                LoggerFactory);
            services.AddSingleton<IPaddleClient>(paddleClient);

            services.AddSingleton<IPaddleWebhookSignatureVerifier>(new PaddleWebhookSignatureVerifier());

            // Configure Google App Engine logging
            if (!Environment.IsDevelopment())
            {
                services.Configure<StackdriverOptions>(Configuration.GetSection("Stackdriver"));

                services.AddGoogleExceptionLogging(options =>
                {
                    options.ProjectId = stackdriverOptions.ProjectId;
                    options.ServiceName = stackdriverOptions.ServiceName;
                    options.Version = stackdriverOptions.Version;
                });

                services.AddGoogleTrace(options =>
                {
                    options.ProjectId = stackdriverOptions.ProjectId;
                    options.Options = TraceOptions.Create(bufferOptions: BufferOptions.NoBuffer());
                });
            }

            services.AddEntityFrameworkNpgsql()
                .AddDbContext<MainDbContext>()
                .BuildServiceProvider();

            // ======= Authentication config =======
            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.None;
            });

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.Authority = "https://maesure.auth0.com/";
                options.Audience = "https://maesure.com/api/";
            })
            .AddCookie(options =>
            {
                options.LoginPath = "/api/auth/login";
                options.LogoutPath = "/api/auth/logout";
                options.SlidingExpiration = true;
                options.ExpireTimeSpan = TimeSpan.FromDays(90);
                options.Cookie.Expiration = TimeSpan.FromDays(90);
                options.Cookie.SameSite = SameSiteMode.Lax; // OAuth login will not work with "strict"
                options.Cookie.IsEssential = true;
            })
            .AddOpenIdConnect("Auth0", options =>
            {
                // Set the authority to your Auth0 domain
                options.Authority = $"https://{Configuration["Auth0:Domain"]}";

                // Configure the Auth0 Client ID and Client Secret
                options.ClientId = Configuration["Auth0:ClientId"];
                options.ClientSecret = Configuration["Auth0:ClientSecret"];

                // Set response type to code
                options.ResponseType = "code";

                // Configure the scope
                options.Scope.Clear();
                options.Scope.Add("openid email profile");

                // Set the callback path, so Auth0 will call back to http://localhost:5000/callback
                // Also ensure that you have added the URL as an Allowed Callback URL in your Auth0 dashboard

                // WARNING: here, "callback" is not some placeholder URL. ASP.NET expects the user to be
                // sent litteral "/callback" URL. Do not change this.
                options.CallbackPath = new PathString("/callback");

                // Configure the Claims Issuer to be Auth0
                options.ClaimsIssuer = "Auth0";

                options.Events = new OpenIdConnectEvents
                {
                    // handle the logout redirection
                    OnRedirectToIdentityProviderForSignOut = (context) =>
                    {
                        var logoutUri = $"https://{Configuration["Auth0:Domain"]}/v2/logout?client_id={Configuration["Auth0:ClientId"]}";

                        var postLogoutUri = context.Properties.RedirectUri;
                        if (!string.IsNullOrEmpty(postLogoutUri))
                        {
                            if (postLogoutUri.StartsWith("/"))
                            {
                                // transform to absolute
                                var request = context.Request;
                                postLogoutUri = request.Scheme + "://" + request.Host + postLogoutUri;
                            }
                            logoutUri += $"&returnTo={ Uri.EscapeDataString(postLogoutUri)}";
                        }

                        context.Response.Redirect(logoutUri);
                        context.HandleResponse();

                        return Task.CompletedTask;
                    },
                    OnRedirectToIdentityProvider = (context) =>
                    {
                        // Check if we need to tell Auth0 explicitly which
                        // connection to use.
                        var properties = context.Properties;
                        var connection = properties.GetString("connection");

                        if (connection != null)
                        {
                            context.ProtocolMessage.SetParameter("connection", connection);
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = async (context) =>
                    {
                        // Ensure that the user exists in our database.
                        using (var db = new MainDbContext())
                        {
                            // Get the Auth0 user details.
                            var userClaims = context.SecurityToken.Claims;
                            var auth0Id = userClaims.FirstOrDefault(c => c.Type == "sub").Value;
                            _log.LogInformation($"Ensuring account exists for '{auth0Id}'");

                            // See if there's a temp account session here.
                            var cookies = context.HttpContext.Request.Cookies;
                            cookies.TryGetValue(PublicWebProxyController.VisitorSessionKey, out var sessionId);

                            await _accountService.EnsureAccountEsists(db, auth0Id, sessionId);
                            _log.LogInformation($"Finished login for '{auth0Id}'");
                        }
                    },
                };
            });

            // ======= Everything else config =======
            services.AddMvc()
                .SetCompatibilityVersion(CompatibilityVersion.Version_2_1)
                .AddControllersAsServices();
            services.AddHttpClient();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            // Require HTTPS.
            app.Use(async (context, next) =>
            {
                var headers = context.Request.Headers;
                var found = headers.TryGetValue("X-Forwarded-Proto", out StringValues protocols);

                // We will redirect to HTTPS _only_ if X-Forwarded-Proto is present and has "https".
                // This indicates that we're behind a load balaner on Google App Engine or something similar.
                if (!found || protocols.First().ToLower() == Uri.UriSchemeHttps.ToLower())
                {
                    if (!env.IsDevelopment())
                        // We're actually behind a load balancer and as far as the browser knows, 
                        // it's talking to us in HTTPS.
                        context.Request.Scheme = "https";

                    await next();
                }
                else
                {
                    string queryString = context.Request.QueryString.HasValue ? context.Request.QueryString.Value : string.Empty;
                    var https = "https://" + context.Request.Host + context.Request.Path + queryString;
                    context.Response.Redirect(https);
                }
            });

            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                // Configure additional Stackdriver services.
                // Note: basic logging is configured in Program.cs.
                app.UseGoogleExceptionLogging();
                app.UseGoogleTrace();

                app.UseHsts();
            }

            app.UseCookiePolicy();
            app.UseAuthentication();

            app.Use(async (context, next) =>
            {
                // Support both Cookie/OpenId Connect and JWT authentication schemes.
                var request = context.Request;
                var authScheme = CookieAuthenticationDefaults.AuthenticationScheme;

                if (request.Headers.ContainsKey("Authorization"))
                {
                    if (request.Headers["Authorization"].First().StartsWith("Bearer"))
                    {
                        authScheme = JwtBearerDefaults.AuthenticationScheme;
                    }
                }

                var authResult = await context.AuthenticateAsync(authScheme);

                if (authResult.Succeeded)
                {
                    context.User = authResult.Principal;

                    // This is a JWT access_token. It should contain a cusom email claim. 
                    // We'll need to map it to a stardard email claim.
                    if (authScheme == JwtBearerDefaults.AuthenticationScheme)
                    {
                        var emailClaim = context.User.Claims.FirstOrDefault(c => c.Type == "https://maesure.com/api/email");

                        if (emailClaim != null)
                        {
                            var emailIdentity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Email, emailClaim.Value) });
                            context.User.AddIdentity(emailIdentity);
                        }
                    }
                }

                await next();
            });

            app.UseHttpStatusCodeExceptionMiddleware();
            app.UseMvc(routes =>
            {
                routes.MapRoute("default", "api/{controller}/{action=Index}");
                routes.MapRoute("web-public", "{*url}", defaults: new { controller = "PublicWebProxy", action = "Get" });
            });
        }

        // ==================== Private =================
        private ILogger<Startup> _log;
        private IAccountService _accountService;
    }
}
