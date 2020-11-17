using System;
using System.Collections.Generic;
using System.Text;

namespace Common.Logging
{
    /// <summary>
    /// This wraps the different types of loggers that we may encounter on different platforms.
    /// </summary>
    public interface IAppLogger
    {
        void Error(Exception message);
    }
}
