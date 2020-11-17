using Newtonsoft.Json;
using System;

namespace Server.Services.Paddle.ClientMessages
{
    public class SubscriptionUser
    {
        [JsonProperty("update_url")]
        public string UpdateUrl { get; set; }

        [JsonProperty("next_payment")]
        public PaymentInfo NextPayment { get; set; }

        public class PaymentInfo
        {
            [JsonProperty("date")]
            public DateTime Date { get; set; }
        }
    }
}
