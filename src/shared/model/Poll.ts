import * as moment from 'moment'

export class Poll {
    id: string = ""
    activeFrom: string = ""
    activeTo: string = ""
    desiredFrequency: string = ""
    wasStarted: boolean = false
    startedAt: Date | null = null

    constructor(init?: Partial<Poll>) {
        if (!init) return

        Object.assign(this, init)

        if (init.startedAt) {
            this.startedAt = new Date(init.startedAt)
        }
    }

    getDesiredFrequencyMin() : number {
        return moment.duration(this.desiredFrequency).asMinutes()
    }
}