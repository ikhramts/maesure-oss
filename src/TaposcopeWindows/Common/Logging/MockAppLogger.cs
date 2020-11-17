using System;
using System.Collections.Generic;

namespace Common.Logging
{
    public class MockClientLogger : IAppLogger
    {
        public List<Exception> LoggedExceptions { get; set; } = new List<Exception>();

        public void Error(Exception exception)
        {
            LoggedExceptions.Add(exception);
        }
    }
}
