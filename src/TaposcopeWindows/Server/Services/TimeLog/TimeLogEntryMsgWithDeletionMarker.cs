using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Services.TimeLog
{
    /// <summary>
    /// This class allows us to do intermediate processing in 
    /// TimeLogService without creating extra objects.
    /// </summary>
    internal class TimeLogEntryMsgWithDeletionMarker : Messages.TimeLogEntryMsg
    {
        /// <summary>
        /// This property is very helpful for filtering out time log deletions
        /// in the TimeLogService. However, we should not expose it to the
        /// UI because it has no use there.
        /// </summary>
        [JsonIgnore]
        public bool IsDeletion { get; set; } = false;

        public TimeLogEntryMsgWithDeletionMarker CloneTimeLogEntryMsgWithDeletionMarker()
        {
            return (TimeLogEntryMsgWithDeletionMarker)MemberwiseClone();
        }
    }
}
