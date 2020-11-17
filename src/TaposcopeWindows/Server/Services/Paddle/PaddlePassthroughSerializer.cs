using Newtonsoft.Json;
using System;

namespace Server.Services.Paddle
{
    public class PaddlePassthroughSerializer
    {
        public string Serialize(Guid accountId)
        {
            var data = new PaddlePassthroughData
            {
                AccountId = accountId
            };

            var json = JsonConvert.SerializeObject(data);
            return json;
        }

        public PaddlePassthroughData Deserialize(string passthrough)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<PaddlePassthroughData>(passthrough);
                return data;
            }
            catch (JsonException ex)
            {
                throw new Exception("Could not deserialize 'passthrough' field.", ex);
            }
        }
    }
}
