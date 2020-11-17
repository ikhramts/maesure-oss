using Newtonsoft.Json;

namespace Server.Services.Paddle.ClientMessages
{
    public class ListSubscriptionUsersRequest : PaddleRequest
    {

        [JsonProperty("subscription_id")]
        public long SubscriptionId { get; set; }

        [JsonProperty("page")]
        public int Page { get; set; } = 1;
        
        [JsonProperty("results_per_page")]
        public int ResultsPerPage { get; set; } = 200;
    }
}
