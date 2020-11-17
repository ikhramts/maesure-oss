export class AccountFlagsSetRequest {
    flags: {[id: string]: boolean} = {}

    constructor(init?: AccountFlagsSetRequest) {
        if (!init) return

        Object.assign(this, init)

        if (init.flags) {
            this.flags = {}
            Object.assign(this.flags, init.flags)
        }
    }
}