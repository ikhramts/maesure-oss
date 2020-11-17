using System;
using System.Collections.Generic;

namespace Server.Db
{
    public class SubscriptionPlan
    {
        public const int TrialPeriodDays = 31;

        public Guid Id { get; set; }
        public string DisplayName { get; set; }
        public decimal MonthlyPrice { get; set; }
        public long PaddleProductId { get; set; }

        public static SubscriptionPlan MaesurePro = new SubscriptionPlan
        {
            Id = new Guid("268de0cc-2f6e-4b84-93db-93f82acec9e1"),
            DisplayName = "Maesure Pro",
            MonthlyPrice = 4.99M,
            PaddleProductId = 583987
        };

        public static Dictionary<Guid, SubscriptionPlan> PlansById = new Dictionary<Guid, SubscriptionPlan>
        {
            { MaesurePro.Id, MaesurePro }
        };
    }
}
