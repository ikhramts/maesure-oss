export class PollResponse {
    timeCollected: Date = new Date(0)
    responseText: string = ""
    timeBlockLengthMin: number = 0
    submissionType: string | null = null

    constructor(init?: Partial<PollResponse>) {
        if (!init) return

        Object.assign(this, init)

        if (init.timeCollected) {
            this.timeCollected = new Date(init.timeCollected)
        }
    }

    getToTime() : Date {
        const timeColectedMsec = this.timeCollected.getTime()
        const toTimeMsec = timeColectedMsec + this.timeBlockLengthMin * 60 * 1000
        let toTime = new Date()
        toTime.setTime(toTimeMsec)
        return toTime
    }

}