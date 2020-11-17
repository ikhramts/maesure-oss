using System;
using System.Collections.Generic;

namespace Server.Db
{
    public class Account
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string Auth0UserId { get; set; }
        public string TempAccountSessionId { get; set; }
        public bool IsDeleted { get; set; }

        public List<AccountFlag> AccountFlags { get; set; }

        public DateTime? TrialExpiryUtc
        {
            get
            {
                if (_trialExpiryUtc == null)
                    return null;

                return DateTime.SpecifyKind(_trialExpiryUtc.Value, DateTimeKind.Utc);
            }

            set => _trialExpiryUtc = value;
        }

        public long? PaddleSubscriptionId { get; set; }

        //===================== Private ===================
        private DateTime? _trialExpiryUtc;



    }
}
