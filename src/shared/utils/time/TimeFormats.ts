import * as moment from 'moment'

export function formatDuration(duration: string) : string {
    const momentDuration = moment.duration(duration);
    const minutes = momentDuration.minutes();
    const days = Math.floor(momentDuration.asDays());
    const hours = momentDuration.hours() + days * 24;

    const minutesFormatted = minutes > 9 ? minutes : "0" + minutes;
    const hoursFormatted = "" + hours + ":"

    const formattedDuration = hoursFormatted + minutesFormatted
    return formattedDuration;
}

export function formatDurationFromMin(totalMinutes: number) : string {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes - hours * 60

    const minutesFormatted = minutes > 9 ? minutes : "0" + minutes;
    const hoursFormatted = "" + hours + ":"

    const formattedDuration = hoursFormatted + minutesFormatted
    return formattedDuration;
}