using Newtonsoft.Json;

namespace Server.Services.Paddle.ClientMessages
{
    public class CancelSubscriptionRequest : PaddleRequest
    {
        [JsonProperty("subscription_id")]
        public long SubscriptionId { get; set; }
    }
}
