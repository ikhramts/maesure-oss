using System;

namespace Messages
{
    public class ClientLogRequest
    {

        public Guid ClientId { get; set; }

        public string Message { get; set; }
        public string Version { get; set; }

    }
}
