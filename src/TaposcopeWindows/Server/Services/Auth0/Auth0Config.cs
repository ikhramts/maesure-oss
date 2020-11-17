using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.Auth0
{
    public class Auth0Config
    {
        public string BaseUrl { get; set; } = "https://maesure.auth0.com";
        public string ClientId { get; set; } = "======== Get it from Auth 0 ==========";
        public string ClientSecret { get; set; } = "======== Get it from Auth 0 ==========";
        public string DbConnection { get; set; } = "Username-Password-Authentication";

        public string ChangePasswordUrl() => BaseUrl + "/dbconnections/change_password";
        public string SignupUrl() => BaseUrl + "/dbconnections/signup";
        public string TokenUrl() => BaseUrl + "/oauth/token";

        public string UserInfoUrl() => BaseUrl + "/userinfo";
        public string UsersByEmail() => BaseUrl + "/api/v2/users-by-email";
        public string UsersUrl() => BaseUrl + "/api/v2/users";

    }
}
