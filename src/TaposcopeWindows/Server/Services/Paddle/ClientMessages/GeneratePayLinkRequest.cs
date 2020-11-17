using Newtonsoft.Json;

namespace Server.Services.Paddle.ClientMessages
{
    public class GeneratePayLinkRequest : PaddleRequest
    {
        [JsonProperty("product_id")]
        public long ProductId { get; set; }

        [JsonProperty("trial_days")]
        public int TrialDays { get; set; }

        [JsonProperty("customer_email")]
        public string CustomerEmail { get; set; }

        [JsonProperty(PaddleField.Passthrough)]
        public string Passthrough { get; set; }
    }
}
