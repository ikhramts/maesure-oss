using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Server
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
                .ConfigureLogging((hostingContext, logging) =>
                {
                    // Configure logging as early as possible.
                    logging.ClearProviders();

                    if (hostingContext.HostingEnvironment.IsDevelopment())
                    {
                        logging.AddConsole();
                        logging.AddDebug();
                    }
                    else
                    {
                        logging.AddLog4Net();
                    }
                })
                .UseStartup<Startup>();
    }
}
