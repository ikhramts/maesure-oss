using System;
using System.Collections.Generic;
using System.Text;

namespace Common.Logging
{
    public class NullLogger : IAppLogger
    {
        public void Error(Exception message)
        {
            // Do nothing.
        }
    }
}
