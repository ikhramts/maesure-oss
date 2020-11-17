using System;

namespace Common.Time
{
    public class SystemTimeService : ITimeService
    {
        public DateTime Now => DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        public DateTime UtcNow => DateTime.UtcNow;
    }
}
