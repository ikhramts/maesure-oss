using System.Collections.Generic;

namespace Server.Services.Paddle
{
    public interface IPaddleWebhookSignatureVerifier
    {
        bool Verify(IEnumerable<KeyValuePair<string, string>> message);
    }
}
