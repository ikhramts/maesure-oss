using Newtonsoft.Json;

namespace Server.Services.Paddle.ClientMessages
{
    public abstract class PaddleRequest
    {
        [JsonProperty("vendor_id")]
        public string VendorId { get; set; }

        [JsonProperty("vendor_auth_code")]
        public string VendorAuthCode { get; set; }

        protected PaddleRequest()
        {
        }
    }
}
