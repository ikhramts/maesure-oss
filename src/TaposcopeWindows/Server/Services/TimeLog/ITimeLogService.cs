using Messages;
using Server.Db;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.TimeLog
{
    public interface ITimeLogService
    {
        Task<IList<TimeLogEntryMsg>> Get(MainDbContext db, Guid pollId, DateTime fromTime, DateTime toTime);
        Task Add(MainDbContext db, Guid pollId, IList<PollResponseAddRequest> reqs);
        Task<TimeLogEntryMsg> Undo(MainDbContext db, Guid pollId, Guid timeLogEntryId);
        Task Delete(MainDbContext db, Guid pollId, TimeLogDeleteRequest req);
        Task Update(MainDbContext db, Guid pollId, TimeLogUpdateRequest req);
    }
}
