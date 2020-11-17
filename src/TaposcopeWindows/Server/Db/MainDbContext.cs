using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography.X509Certificates;
using System.Text.RegularExpressions;

namespace Server.Db
{
    public class MainDbContext : DbContext
    {
        public DbSet<Account> Accounts { get; set; }
        public DbSet<AccountFlag> AccountFlags { get; set; }
        public DbSet<ActivityGroup> ActivityGroups { get; set; }
        public DbSet<ClientCheckin> ClientCheckins { get; set; }
        public DbSet<Poll> Polls { get; set; }
        public DbSet<PollResponse> PollResponses { get; set; }
        public DbSet<PollFixedOption> PollFixedOptions { get; set; }
        public DbSet<TimeLogEntry> TimeLogEntries { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            var connectionString = "Uid=svc_taposcope;Pwd=lgUqHgUgBk77;Host=35.193.92.33;Database=postgres;SSL Mode=Require;Trust Server Certificate=true";

            optionsBuilder.UseNpgsql(connectionString, options =>
            {
                options.ProvideClientCertificatesCallback(certs =>
                {
                    certs.Add(new X509Certificate2("postgres_client.pfx"));
                });
            });

            base.OnConfiguring(optionsBuilder);
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            // Convert all table/column/key names to snake case, e.g. ColumnName -> column_name.
            // We need this because Postgres sets all columns to lowercase.
            foreach (var entity in builder.Model.GetEntityTypes())
            {
                entity.Relational().TableName = ToSnakeCase(entity.Relational().TableName);

                foreach (var property in entity.GetProperties())
                    property.Relational().ColumnName = ToSnakeCase(property.Name);

                foreach (var key in entity.GetKeys())
                    key.Relational().Name = ToSnakeCase(key.Relational().Name);

                foreach (var key in entity.GetForeignKeys())
                    key.Relational().Name = ToSnakeCase(key.Relational().Name);
            }
        }

        private static string ToSnakeCase(string str)
        {
            var startUnderscores = Regex.Match(str, "^_+").ToString();
            return startUnderscores + Regex.Replace(str, "([a-z0-9])([A-Z])", "$1_$2").ToLower();
        }
    }
}
