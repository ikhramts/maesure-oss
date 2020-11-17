import * as moment from 'moment'

export function minuteOfDay(time: Date | string) : number {
    let dateTime : Date

    if (typeof time === "string") {
        dateTime = moment(time).toDate()
    } else {
        dateTime = time
    }

    return dateTime.getHours() * 60 + dateTime.getMinutes()
}