import { Poll } from "shared/model/Poll";
import * as moment from 'moment'

export function getLatestPopupTimeBefore(poll: Poll, beforeTime: Date) {
    const desiredFrequencyMin = moment.duration(poll.desiredFrequency).asMinutes()
    const momentBeforeTime = moment(beforeTime)
    const lastMinute = momentBeforeTime.hours() * 60 + momentBeforeTime.minutes()

    let countFromMinute = 0

    const startedAt = moment(poll.startedAt!!)
    if (startedAt.isSame(momentBeforeTime, 'date')) {
        // We'll start counting from the end of the first full period after the 
        // start of the poll because we don't want to accidentally show two
        // popups right after the poll startedAt time.
        countFromMinute = startedAt.hours() * 60 + startedAt.minutes() + desiredFrequencyMin
    }

    const lastPeriodEnd = Math.floor((lastMinute - countFromMinute) / desiredFrequencyMin)
    const lastDueTimeMinuteOfDay = countFromMinute + desiredFrequencyMin * lastPeriodEnd

    const lastDueTime = momentBeforeTime.startOf('day').add(lastDueTimeMinuteOfDay, 'minutes').toDate()
    return lastDueTime
}

export function getNthPrecedingPopupMinute(poll: Poll, beforeTime: Date, popupsAgo: number) {
    // We start with the latest popup time and go popupsAgo into the past
    // unless we get to the start of day or poll.startedAt.
    const latestPopupTime = moment(getLatestPopupTimeBefore(poll, beforeTime))
    const startedAt = moment(poll.startedAt!!)
    const latestPopupTimeMin = latestPopupTime.hours() * 60 + latestPopupTime.minutes()
    const desiredFrequencyMin = moment.duration(poll.desiredFrequency).asMinutes()

    let earliestMinute = 0

    const startedAtDay = moment(startedAt).startOf('day')
    const latestPopupDay = moment(latestPopupTime).startOf('day')
    if (startedAtDay.unix() == latestPopupDay.unix()) {
        // The poll started today. Should not go back farther than the poll start
        // time.
        earliestMinute = startedAt.hours() * 60 + startedAt.minutes()
    }

    const rawNthPrecedingPopupTime = latestPopupTimeMin - desiredFrequencyMin * popupsAgo
    const nthPreedingPopupTime = Math.max(rawNthPrecedingPopupTime, earliestMinute)

    return nthPreedingPopupTime
}

export function getEarliestAllowedPopupMinute(poll: Poll, now: Date) {
    // unless we get to the start of day or poll.startedAt.
    const startedAt = moment(poll.startedAt!!)
    const startedAtDay = moment(startedAt).startOf('day')

    let earliestMinute = 0

    if (startedAtDay.unix() == moment(now).startOf('day').unix()) {
        // The poll started today. Should not go back farther than the poll start
        // time.
        const hours = startedAt.hours()
        const minutes = startedAt.minutes()
        earliestMinute = hours * 60 + minutes
    }

    return earliestMinute
}