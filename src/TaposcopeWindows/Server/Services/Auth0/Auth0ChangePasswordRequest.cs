using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.Auth0
{
    public class Auth0ChangePasswordRequest
    {
        [JsonProperty("client_id")]
        public string ClientId { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; }

        [JsonProperty("connection")]
        public string Connecton { get; set; }
    }
}
