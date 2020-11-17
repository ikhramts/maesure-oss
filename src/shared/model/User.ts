import { AccountFlags } from './AccountFlags'
import { AccountType } from "./AccountType"
import { AccountProvider } from "./AccountProvider"

export class User {
    accountType: AccountType = AccountType.NONE
    accountProvider: AccountProvider = AccountProvider.NONE
    email: string | null = null
    picture: string | null = null
    flags: AccountFlags = {}
    remainingTrialDays: number = 0

    public constructor(init?: Partial<User>) {
        if (!init)
            return

        Object.assign(this, init)

        if (init.flags) {
            this.flags = new AccountFlags(init.flags)
        }
    }
}