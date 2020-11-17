using System.Timers;

namespace Common.Time
{
    public interface ITimer
    {
        void Start(double interval);
        void Stop();
        event ElapsedEventHandler Elapsed;
        double Interval { get; set; }
        bool Enabled { get; set; }
        bool AutoReset { get; set; }
    }
}
