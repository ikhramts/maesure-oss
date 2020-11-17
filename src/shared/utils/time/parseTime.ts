export function parseTime(text: string): Date | null {
    // Parse out the components.
    const normalized = text.trim().replace(/\s/g, "").toLowerCase()
    const match = normalized.match(/^(\d?\d)([\.\-:])?(\d?\d)?(am?|pm?)?$/)

    if (!match) {
        return null
    }

    const expectedGroups = 5
    if (match.length < expectedGroups) {
        throw `Got ${match.length} matches; expected ${expectedGroups}.`
    }

    let hoursStr = match[1]
    const divider = match[2]
    let minutesStr = match[3]
    const amPmStr = match[4]

    if (!divider && minutesStr && hoursStr.length > 1 && minutesStr.length == 1) {
        // Should parse e.g. "115" as "1:15", not "11:5"
        minutesStr = hoursStr[1] + minutesStr
        hoursStr = hoursStr[0]
    }

    let hours = parseInt(trimLeadingZero(hoursStr))

    let minutes = 0

    if (minutesStr) {
        minutes = parseInt(trimLeadingZero(minutesStr))
    }

    let isPm = false
    if (amPmStr && amPmStr.startsWith('p')) {
        isPm = true
    }

    if (hours < 12 && isPm) {
        hours += 12
    }

    // Validate.
    if (hours >= 24) {
        return null
    }

    if (minutes >= 60) {
        return null
    }

    // Done.
    return new Date(1970, 0, 1, hours, minutes)
}

function trimLeadingZero(text: string) : string {
    if (!text) {
        return text
    }

    if (text.length >= 2 && text.startsWith('0')) {
        return text.substr(1)
    }

    return text
}