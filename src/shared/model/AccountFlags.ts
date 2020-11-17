export class AccountFlags {
    appInstalled?: boolean
    webTrackerEnabled?: boolean

    constructor(init?: Partial<AccountFlags>) {
        if (!init) return

        Object.assign(this, init)
    }
}