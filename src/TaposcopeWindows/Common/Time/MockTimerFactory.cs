namespace Common.Time
{
    public class MockTimerFactory : ITimerFactory
    {
        public MockTimer LastTimer { get; private set; }

        public ITimer GetTimer()
        {
            var timer = new MockTimer();
            LastTimer = timer;
            return timer;
        }
    }
}
