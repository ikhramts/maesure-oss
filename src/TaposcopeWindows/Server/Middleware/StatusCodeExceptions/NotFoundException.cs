namespace Server.Middleware.StatusCodeExceptions
{
    public class NotFoundException : HttpStatusCodeException
    {
        public NotFoundException(string message = null) 
            : base(404, message ?? "Not found")
        {

        }
    }
}
