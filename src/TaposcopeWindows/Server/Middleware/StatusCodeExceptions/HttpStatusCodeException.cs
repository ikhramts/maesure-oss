using System;

namespace Server.Middleware.StatusCodeExceptions
{
    public class HttpStatusCodeException : Exception
    {
        public int StatusCode { get; private set; }

        public HttpStatusCodeException(int statusCode, string message = null)
            : base(message)
        {
            StatusCode = statusCode;
        }
    }
}
