export class TotalsForActivity {
    public name: string = ""
    public activityGroupId?: string = undefined
    public timeSpentPerPeriod: string[] = []
    public key: string = ""
    public children: TotalsForActivity[] = []
    public parentId?: string
    public tracksExactParentMatches: boolean = false
    public tracksPollResponseText: boolean = false

    public constructor(init?: Partial<TotalsForActivity>) {
        if (!init) return

        Object.assign(this, init)

        if (init.children) {
            this.children = init.children.map(ch => new TotalsForActivity(ch))
        }
    }
}