using System.Threading.Tasks;

namespace Server.Services.Auth0
{
    public interface IAuth0Client
    {
        Task DeleteUser(string auth0UserId);

        Task<Auth0UserInfoResult> GetUserInfo(string accessToken);

        Task<bool> IsEmailAvailable(string email);

        Task SendChangePasswordEmail(string email);

        /// <summary>
        /// Submits the signup request to Auth0 and returns the resulting Auth0 user ID.
        /// </summary>
        /// <param name="email"></param>
        /// <param name="password"></param>
        /// <returns>Auth0 user ID without the leading "auth0|"</returns>
        Task<string> Signup(string email, string password);
    }
}
