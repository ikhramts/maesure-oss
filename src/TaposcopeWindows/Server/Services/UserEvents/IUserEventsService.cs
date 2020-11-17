using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.UserEvents
{
    public interface IUserEventsService
    {
        Task RecordEvent(UserEvent userEvent);
    }
}
