using Newtonsoft.Json;

namespace Server.Services.Auth0
{
    public class Auth0CheckEmailExistsResult
    {
        [JsonProperty("email")]
        public string Email { get; set; }
    }
}
