using System.Timers;

namespace Common.Time
{
    public class MockTimer : ITimer
    {
        public bool AutoReset { get; set; } = true;

        private bool _enabled;

        public bool Enabled
        {
            get => _enabled;
            set
            {
                _enabled = value;

                if (value == false)
                    WasStopped = true;
            }
        }

        public double Interval { get; set; }
        public bool WasStopped { get; private set; }

        public event ElapsedEventHandler Elapsed;

        public void Start(double interval)
        {
            Interval = interval;
            Enabled = true;
        }

        public void Stop()
        {
            Enabled = false;
        }

        public void TriggerElapsed()
        {
            if (!AutoReset)
                Enabled = false;

            Elapsed?.Invoke(null, null);
        }
    }
}
