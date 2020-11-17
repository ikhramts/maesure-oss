using System;

namespace Common.Time
{
    public interface ITimeService
    {
        DateTime Now { get; }
        DateTime UtcNow { get; }
    }
}
