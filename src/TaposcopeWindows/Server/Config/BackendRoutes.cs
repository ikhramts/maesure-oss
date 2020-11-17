using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Config
{
    public class BackendRoutes
    {
        public string Dashboard { get; set; }
        public readonly string PublicWeb = "https://static.maesure.com/web-public";
        public readonly string Downloads = "https://static.maesure.com/downloads";
    }
}
