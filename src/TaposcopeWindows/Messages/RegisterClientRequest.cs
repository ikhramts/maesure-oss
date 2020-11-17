using System;

namespace Messages
{
    public class RegisterClientRequest
    {
        public string Auth0UserId { get; set; }
        public string AccessToken { get; set; }
        public string ClientName { get; set; }
    }
}
