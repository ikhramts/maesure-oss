import { TimeLogEntry } from "./TimeLogEntry";

export class TimeLog {
    entries: TimeLogEntry[] = []

    public constructor(init?: Partial<TimeLog>) {
        if (!init) return

        Object.assign(this, init)

        if (init.entries) {
            this.entries = init.entries.map(e => new TimeLogEntry(e))
        }
    }
}