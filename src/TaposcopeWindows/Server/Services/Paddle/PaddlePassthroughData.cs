using Newtonsoft.Json;
using System;

namespace Server.Services.Paddle
{
    public class PaddlePassthroughData
    {
        [JsonProperty("account_id")]
        public Guid AccountId { get; set; }
    }
}
