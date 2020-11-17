using System;

namespace Server.Db
{
    public class ClientCheckin
    {
        public Guid Id { get;set; }
        public Guid AccountId { get; set; }
        public DateTime TimestampUtc { get; set; }
        public string ClientType { get; set; }
        public string ClientVersion { get; set; }
    }
}
