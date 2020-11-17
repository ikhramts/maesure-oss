export class ClientCheckinRequest {
    clientType: string = ""
    clientVersion: string = ""

    constructor(init?: ClientCheckinRequest) {
        if (!init) return

        Object.assign(this, init)
    }
}