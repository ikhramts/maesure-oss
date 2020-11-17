using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using System;

namespace Server.Tests.Mocks
{
    public class MockLoggerFactory : ILoggerFactory
    {
        public void AddProvider(ILoggerProvider provider)
        {
            throw new NotImplementedException();
        }

        public ILogger CreateLogger(string categoryName)
        {
            return new NullLogger<MockLoggerFactory>();
        }

        public void Dispose()
        {
            
        }
    }
}
