using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Messages;
using Server.Db;

// Suppress warning for async methods not having an await.
// This is a mock, so we don't really care.
#pragma warning disable CS1998
namespace Server.Services.TimeLog
{
    public class MockTimeLogService : ITimeLogService
    {
        public List<TimeLogEntryMsg> Data { get; set; } = new List<TimeLogEntryMsg>();
        public Guid LastGetPollId { get; set; }
        public DateTime LastGetFromTime { get; set; }
        public DateTime LastGetToTime { get; set; }

        public Task Add(MainDbContext db, Guid pollId, IList<PollResponseAddRequest> reqs)
        {
            throw new NotImplementedException();
        }

        public Task Delete(MainDbContext db, Guid pollId, TimeLogDeleteRequest req)
        {
            throw new NotImplementedException();
        }

        public async Task<IList<TimeLogEntryMsg>> Get(MainDbContext db, Guid pollId, DateTime fromTime, DateTime toTime)
        {
            LastGetPollId = pollId;
            LastGetFromTime = fromTime;
            LastGetToTime = toTime;
            return Data.Where(e => e.FromTime < toTime && e.GetToTime() > fromTime).ToList();
        }

        public Task<TimeLogEntryMsg> Undo(MainDbContext db, Guid pollId, Guid timeLogEntryId)
        {
            throw new NotImplementedException();
        }

        public Task Update(MainDbContext db, Guid pollId, TimeLogUpdateRequest req)
        {
            throw new NotImplementedException();
        }
    }
}
#pragma warning restore CS1998

