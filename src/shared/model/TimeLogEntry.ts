import * as moment from 'moment'

export class TimeLogEntry {
    id = ""
    fromTime: string = ""
    entryText: string = ""
    timeBlockLength: string = ""
    submissionType: string | null = null

    public constructor(init?: Partial<TimeLogEntry>) {
        if (!init) return

        Object.assign(this, init)
    }

    getFromTimeAsDate() : Date {
        return moment(this.fromTime).toDate()
    }

    getTimeBlockLengthMin() : number {
        return moment.duration(this.timeBlockLength).asMinutes()
    }

    getToTime() : Date {
        const fromTime = moment(this.fromTime)
        const timeBlockLength = moment.duration(this.timeBlockLength)
        const toTime = fromTime.add(timeBlockLength)
        return toTime.toDate()
    }

    getFromTimeDate() : Date {
        const fromTime = moment(this.fromTime)
        return fromTime.toDate()
    }
}