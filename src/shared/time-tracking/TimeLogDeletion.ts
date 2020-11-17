export class TimeLogDeletion {
    fromTime: Date = new Date()
    toTime: Date = new Date()

    constructor(init?: Partial<TimeLogDeletion>) {
        if (!init) return
        
        Object.assign(this, init)
    }
}