namespace Server.Middleware.StatusCodeExceptions
{
    public class UnauthorizedException : HttpStatusCodeException
    {
        public UnauthorizedException(string message = null)
            : base(401, message ?? "Unauthorized")
        {

        }
    }
}
