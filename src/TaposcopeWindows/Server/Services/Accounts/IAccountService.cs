using Server.Db;
using System.Threading.Tasks;

namespace Server.Services.Accounts
{
    public interface IAccountService
    {
        Task<Account> EnsureAccountEsists(MainDbContext db, string auth0UserId, string tempAccountSessionId);
    }
}
