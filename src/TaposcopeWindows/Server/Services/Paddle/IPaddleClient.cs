using Server.Db;
using Server.Services.Paddle.ClientMessages;
using System.Threading.Tasks;

namespace Server.Services.Paddle
{
    public interface IPaddleClient
    {
        Task<string> GeneratePayLink(long productId, int trialDays, string customerEmail, string passthrough);
        Task<SubscriptionUser> GetSubscriptionUser(long subscriptionId);
        Task CancelSubscription(long subscriptionId);
    }
}
