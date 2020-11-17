using Common.Logging;

namespace Common.Time
{
    public class SystemTimerFactory : ITimerFactory
    {
        public SystemTimerFactory(IAppLogger log)
        {
            _log = log;
        }

        public ITimer GetTimer() => new SystemTimer(_log);

        //=============== Private ==============
        private IAppLogger _log;
    }
}
