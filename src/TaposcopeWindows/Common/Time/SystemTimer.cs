using Common.Logging;
using System;
using System.Timers;

namespace Common.Time
{
    public class SystemTimer : ITimer
    {
        public event ElapsedEventHandler Elapsed;

        public double Interval
        {
            get => _timer.Interval;
            set { _timer.Interval = value; }
        }

        public bool Enabled
        {
            get => _timer.Enabled;
            set { _timer.Enabled = value; }
        }

        public bool AutoReset
        {
            get => _timer.AutoReset;
            set { _timer.AutoReset = value; }
        }

        public SystemTimer(IAppLogger log)
        {
            _log = log;
            _timer = new Timer();
            _timer.Elapsed += OnTimerElapsed;
        }

        public void Start(double interval)
        {
            _timer.Start();
        }

        public void Stop()
        {
            _timer.Stop();
        }

        // ============= Private =============
        private Timer _timer = new Timer();
        private IAppLogger _log;

        private void OnTimerElapsed(object sender, ElapsedEventArgs args)
        {
            try
            {
                Elapsed?.Invoke(sender, args);
            }
            catch (Exception ex)
            {
                _log.Error(ex);
                throw;
            }
        }
    }
}
