using Server.Db;

namespace Server.Tests.Mocks
{
    public class MockMainDbContextData
    {
        public MockMainDbContextData(MockMainDbContext db)
        {
            _db = db;
        }

        public MockDbSet<Account> Accounts { get => (MockDbSet<Account>)_db.Accounts; }
        public MockDbSet<AccountFlag> AccountFlags { get => (MockDbSet<AccountFlag>)_db.AccountFlags; }
        public MockDbSet<ActivityGroup> ActivityGroups { get => (MockDbSet<ActivityGroup>)_db.ActivityGroups; }
        public MockDbSet<ClientCheckin> ClientCheckins { get => (MockDbSet<ClientCheckin>)_db.ClientCheckins; }
        public MockDbSet<Poll> Polls { get => (MockDbSet<Poll>)_db.Polls; }
        public MockDbSet<PollResponse> PollResponses { get => (MockDbSet<PollResponse>)_db.PollResponses; }
        public MockDbSet<PollFixedOption> PollFixedOptions { get => (MockDbSet<PollFixedOption>)_db.PollFixedOptions; }
        public MockDbSet<TimeLogEntry> TimeLogEntries { get => (MockDbSet<TimeLogEntry>)_db.TimeLogEntries; }

        // ===================== Private =========================
        MockMainDbContext _db;
    }
}
