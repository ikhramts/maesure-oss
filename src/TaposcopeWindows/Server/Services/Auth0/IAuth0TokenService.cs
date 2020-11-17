using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.Auth0
{
    public interface IAuth0TokenService
    {
        string Token { get; }
    }
}
