using Newtonsoft.Json;
namespace Server.Services.Paddle.ClientMessages
{
    public class PaddleReply
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        /// <summary>
        /// This field will not be present if there is no error.
        /// </summary>
        [JsonProperty("error")]
        public PaddleError Error { get; set; }

        public class PaddleError
        {
            [JsonProperty("code")]
            public int Code { get; set; }

            [JsonProperty("message")]
            public string Message { get; set; }
        }
    }

    public class PaddleReply<T> : PaddleReply
    {
        [JsonProperty("response")]
        public T Response { get; set; }

    }
}
