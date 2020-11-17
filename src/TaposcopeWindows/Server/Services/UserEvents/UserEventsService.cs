using Google.Cloud.BigQuery.V2;
using System;
using System.Threading.Tasks;

namespace Server.Services.UserEvents
{
    public class UserEventsService : IUserEventsService
    {
        public UserEventsService(StackdriverOptions options)
        {
            _bigQueryClient = BigQueryClient.Create(options.ProjectId);
        }

        public async Task RecordEvent(UserEvent userEvent)
        {
            // Validate.
            if (string.IsNullOrWhiteSpace(userEvent.Category))
            {
                throw new ArgumentNullException("userEvent.Category");
            }
            else if (string.IsNullOrWhiteSpace(userEvent.Name))
            {
                throw new ArgumentNullException("userEvent.Name");
            };

            // Insert the row.
            var row = new BigQueryInsertRow(insertId: Guid.NewGuid().ToString())
            {
                { "timestamp", DateTime.UtcNow },
                { "category", userEvent.Category },
                { "name", userEvent.Name },
            };

            if (userEvent.SessionId != null)
            {
                row["session_id"] = userEvent.SessionId;
            }

            if (userEvent.Account != null)
            {
                var account = userEvent.Account;

                if (account.Id != default)
                    row["account_id"] = userEvent.Account.Id.ToString();

                if (!string.IsNullOrEmpty(account.Auth0UserId))
                    row["auth0_user_id"] = userEvent.Account.Auth0UserId;
            }

            if (userEvent.Value != null)
            {
                row["value"] = userEvent.Value;
            }

            await _bigQueryClient.InsertRowAsync("maesure_user_actions", "user_events", row);
        }

        // ================= Private ======================
        private BigQueryClient _bigQueryClient;
    }
}
