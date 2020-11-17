import * as moment from 'moment'
import { TimeLogEntry } from "./TimeLogEntry"

export interface TimeLogEntrySuggestion {
    suggestedFromDate?: Date
    suggestedFromTime?: Date
    suggestedToTime?: Date
    suggestedEntryText?: string

}

export function suggestionsFromEntry(entry: TimeLogEntry) : TimeLogEntrySuggestion {
    return <TimeLogEntrySuggestion> {
        suggestedFromDate: moment(entry.fromTime).startOf('day').toDate(),
        suggestedFromTime: entry.getFromTimeAsDate(),
        suggestedToTime: entry.getToTime(),
        suggestedEntryText: entry.entryText
    }
}
