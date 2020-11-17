using Common.Http;
using Microsoft.AspNetCore.WebUtilities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.Auth0
{
    public class Auth0Client : IAuth0Client
    {
        public Auth0Client(IAuth0TokenService tokenService, IRestClient restClient)
        {
            _tokenService = tokenService;
            _restClient = restClient;
        }

        public async Task DeleteUser(string auth0UserId)
        {
            var url = _config.UsersUrl() + "/" + auth0UserId;
            var authHeader = GetAuthorizationHeader();
            var result = await _restClient.Delete(url, auth: authHeader);

            if (!result.IsSuccess)
            {
                throw new Exception("Failed to delete a user in Auth0: " + result.Error);
            }
        }

        public async Task<Auth0UserInfoResult> GetUserInfo(string accessToken)
        {
            var result = await _restClient.Get<Auth0UserInfoResult>(_config.UserInfoUrl(), auth: $"Bearer {accessToken}");

            if (result.StatusCode == 401 || result.StatusCode == 403)
            {
                throw new UnauthorizedAccessException(result.Error);
            }
            else if (!result.IsSuccess)
            {
                throw new Exception(result.Error);
            }

            return result.Result;
        }

        public async Task<bool> IsEmailAvailable(string email)
        {
            // Compose the request. This is a GET request with URL params.
            // https://auth0.com/docs/api/management/v2#!/Users_By_Email/get_users_by_email
            var baseUrl = _config.UsersByEmail();
            var queryParams = new Dictionary<string, string>()
            {
                { "fields", "email" },
                { "include_fields", "true" },
                { "email", email },
            };

            var url = QueryHelpers.AddQueryString(baseUrl, queryParams);

            // Make the request
            var authHeader = GetAuthorizationHeader();
            var result = await _restClient.Get<List<Auth0CheckEmailExistsResult>>(url, auth: authHeader);

            // Process the result.
            if (!result.IsSuccess)
            {
                throw new Exception("Failed to load users by email: " + result.Error);
            }

            return !result.Result.Any();
        }

        private int List<T>(string url, string auth)
        {
            throw new NotImplementedException();
        }

        public async Task SendChangePasswordEmail(string email)
        {
            var request = new Auth0ChangePasswordRequest
            {
                ClientId = _config.ClientId,
                Email = email,
                Connecton = _config.DbConnection,
            };

            var url = _config.ChangePasswordUrl();
            var result = await _restClient.Post(url, request);

            if (!result.IsSuccess)
            {
                throw new Exception("Failed to send a password change email: " + result.Error);
            }
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="email"></param>
        /// <param name="password"></param>
        /// <returns>Auth0 user ID without the leading "auth0|"</returns>
        public async Task<string> Signup(string email, string password)
        {
            var signupRequest = new Auth0SignupRequest
            {
                ClientId = _config.ClientId,
                Email = email,
                Password = password,
                Connection = _config.DbConnection,
            };

            var signupEndpoint = _config.SignupUrl();
            var signupResult = await _restClient.Post<Auth0SignupResult>(signupEndpoint, signupRequest);

            if (!signupResult.IsSuccess)
            {
                // Failed to create the user. This should not happen - validation
                // should catch problems before this point.
                throw new Exception("An error occurred while creating an Auth0 user: " + signupResult.Error);
            }

            // Successfully created the user.
            var auth0UserId = signupResult.Result.Id;
            return auth0UserId;
        }

        //=================== Private =======================
        private Auth0Config _config = new Auth0Config();
        private IAuth0TokenService _tokenService;
        private IRestClient _restClient;

        private string GetAuthorizationHeader()
        {
            var token = _tokenService.Token;
            return $"Bearer {token}";
        }
    }
}
