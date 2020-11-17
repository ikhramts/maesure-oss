using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Server.Db;

namespace Server.Tests.Mocks
{
    public class MockMainDbContext : MainDbContext
    {
        public MockMainDbContextData Mock { get; }
        public bool WasSaveChangesCalled { get; private set; }

        public MockMainDbContext()
        {
            Accounts = new MockDbSet<Account>();
            AccountFlags = new MockDbSet<AccountFlag>();
            ActivityGroups = new MockDbSet<ActivityGroup>();
            ClientCheckins = new MockDbSet<ClientCheckin>();
            Polls = new MockDbSet<Poll>();
            PollResponses = new MockDbSet<PollResponse>();
            PollFixedOptions = new MockDbSet<PollFixedOption>();
            TimeLogEntries = new MockDbSet<TimeLogEntry>();

            Mock = new MockMainDbContextData(this);
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // Do nothing.
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            // Do nothing.
        }

        public override int SaveChanges()
        {
            WasSaveChangesCalled = true;
            return 1;
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default(CancellationToken))
        {
            WasSaveChangesCalled = true;
            return Task.FromResult(1);
        }
    }
}
