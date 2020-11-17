export class SignUpRequest {
    email = ""
    password = ""
    hasConfirmedTermsAndConditions = false

    constructor(init?: Partial<SignUpRequest>) {
        if (!init) return

        Object.assign(this, init)
    }
}