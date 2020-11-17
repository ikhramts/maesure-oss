using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace Server.Tests.Mocks
{
    public static class MockLogger
    {
        public static ILogger<T> Get<T>() => new NullLogger<T>();
    }
}
