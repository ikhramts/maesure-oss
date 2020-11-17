namespace Server.Middleware.StatusCodeExceptions
{
    public class BadRequestException : HttpStatusCodeException
    {
        public BadRequestException(string message = null) 
            :base(400, message ?? "Bad request")
        {

        }
    }
}
