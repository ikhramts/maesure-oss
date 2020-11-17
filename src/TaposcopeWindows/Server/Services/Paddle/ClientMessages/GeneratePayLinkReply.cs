using Newtonsoft.Json;

namespace Server.Services.Paddle.ClientMessages
{
    public class GeneratePayLinkReply
    {
        [JsonProperty("url")]
        public string Url { get; set; }
    }
}
