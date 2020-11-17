import { TotalsForActivity } from './TotalsForActivity'

export class TotalsResult {
    public startingDates: Date[] = []
    public activities: TotalsForActivity[] = []

    public constructor(init?: Partial<TotalsResult>) {
        if (!init) {
            return
        }

        if (init.startingDates) {
            this.startingDates = init.startingDates.map(d => new Date(d))
        }

        if (init.activities) {
            this.activities = init.activities.map(a => new TotalsForActivity(a))
        }
    }

    public hasData() {
        return (this.activities && this.activities.length > 0)
    }
}