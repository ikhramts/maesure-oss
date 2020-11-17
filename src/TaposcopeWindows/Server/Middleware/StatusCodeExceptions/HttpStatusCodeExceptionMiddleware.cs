using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace Server.Middleware.StatusCodeExceptions
{
    public class HttpStatusCodeExceptionMiddleware
    {
        public HttpStatusCodeExceptionMiddleware(RequestDelegate next, ILoggerFactory loggerFactory)
        {
            _next = next;
            _logger = loggerFactory.CreateLogger<HttpStatusCodeExceptionMiddleware>();
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (HttpStatusCodeException e)
            {
                if (context.Response.HasStarted)
                {
                    _logger.LogWarning("The response has already started, " +
                        "the http status code middleware will not be executed.");
                    throw;
                }

                context.Response.Clear();
                context.Response.StatusCode = e.StatusCode;
                context.Response.ContentType = "text/plain";

                var body = e.Message ?? "";

                if (e.Message != null)
                {
                    await context.Response.WriteAsync(body);
                }
            }
            catch (Exception)
            {
                throw;
            }
        }

        // ================== Private ===================
        private readonly RequestDelegate _next;
	    private readonly ILogger<HttpStatusCodeExceptionMiddleware> _logger;
    }
}
