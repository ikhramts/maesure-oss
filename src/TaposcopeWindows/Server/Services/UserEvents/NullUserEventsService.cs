using System.Threading.Tasks;

namespace Server.Services.UserEvents
{
    public class NullUserEventsService : IUserEventsService
    {
        public Task RecordEvent(UserEvent userEvent)
        {
            // Do nothing.
            return Task.CompletedTask;
        }
    }
}
