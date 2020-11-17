using System;

namespace Common.Time
{
    public class MockTimeService : ITimeService
    {
        public DateTime Now { get; set; }
        public DateTime UtcNow
        {
            get => _utcNow;
            set => _utcNow = DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        // ========================= Private =========================
        private DateTime _utcNow;
    }
}
