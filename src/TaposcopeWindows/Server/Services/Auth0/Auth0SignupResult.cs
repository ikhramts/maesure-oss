using Newtonsoft.Json;

namespace Server.Services.Auth0
{
    public class Auth0SignupResult
    {
        [JsonProperty("_id")]
        public string Id { get; set; }
    }
}
