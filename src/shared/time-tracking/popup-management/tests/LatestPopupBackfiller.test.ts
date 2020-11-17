import { MockTimeService } from "shared/utils/time/MockTimeService";
import { PollPopup } from "shared/model/PollPopup";
import { LatestPopupBackfiller } from "../LatestPopupBackfiller";
import * as moment from 'moment'
import { Poll } from "shared/model/Poll";

const TEST_NOW = new Date(2019, 5, 8, 9, 1, 0)
const testTimeCollected = moment(TEST_NOW).subtract(1, 'minutes').toDate()
let timeService = new MockTimeService()

let capturedPopups: PollPopup[] = []
let backfiller = new LatestPopupBackfiller(timeService)

const testPoll = new Poll({
    activeFrom: "0:00:00",
    activeTo: "24:00:00",
    desiredFrequency: "0:10:00",
    wasStarted: true,
    startedAt: moment(TEST_NOW).subtract(3, 'days').toDate() // long enough ago to not matter
});

beforeEach(() => {
    timeService = new MockTimeService()
    timeService.setNow(TEST_NOW)

    capturedPopups = []
    backfiller = new LatestPopupBackfiller(timeService)
    backfiller.onPopupDue(popup => {capturedPopups.push(popup)})
    backfiller.updatePoll(testPoll)
})

describe("Regular backfill operations", () => {
    test("When first scheduled popup is missed, should immediately show a longer backfill popup for it", () => {
        // Set up
        let regularPopup = getPopup(testTimeCollected)
        
        // Act
        backfiller.responseMissed(regularPopup)

        // Assert
        expect(capturedPopups).toHaveLength(1)
        expect(capturedPopups[0].timeBlockLengthMin).toBe(10)
        expect(capturedPopups[0].timeCollected).toStrictEqual(testTimeCollected)
    })
    
    test("If a backfill popup is missed, should show it again", () => {
        // Miss a regular popup
        let regularPopup = getPopup(testTimeCollected)
        backfiller.responseMissed(regularPopup)

        // Then miss the backfill popup.
        advanceTimeMin(1)
        const backfillPopup = capturedPopups[0]
        capturedPopups.length = 0
        backfiller.responseMissed(backfillPopup)

        // Assert - there's another popup
        expect(capturedPopups).toHaveLength(1)
        expect(capturedPopups[0].timeBlockLengthMin).toBe(10)
        expect(capturedPopups[0].timeCollected).toStrictEqual(testTimeCollected)
    })
    
    test("If was showing a backfill popup for most recently missed regular popup and another regular popup was missed, should show backfill popup only for the new regular popup", () => {
        // Miss a regular popup
        let regularPopup = getPopup(testTimeCollected)
        backfiller.responseMissed(regularPopup)
        const backfillPopup = capturedPopups[0]
        capturedPopups.length = 0

        // Miss the second regular popup
        advanceTimeMin(9)
        let regularPopup2 = getPopup(timeService.now())
        advanceTimeMin(1)
        backfiller.responseMissed(regularPopup2)
        capturedPopups.length = 0

        // Miss the first backfill popup
        backfiller.responseMissed(backfillPopup)

        // Assert - this should not generate another popup.
        expect(capturedPopups).toHaveLength(0)
    })
    
    test("Do not show backfill for preceding popup if another regular popup is due", () => {
        // Miss a regular popup
        let regularPopup = getPopup(testTimeCollected)
        backfiller.responseMissed(regularPopup)
        
        // Miss a backfill popup much later
        const backfillPopup = capturedPopups[0]
        capturedPopups.length = 0
        advanceTimeMin(10)
        backfiller.responseMissed(backfillPopup)

        // Assert - this should not generate another popup
        expect(capturedPopups).toHaveLength(0)    
    })
})

describe("Starting and stopping", () => {
    test("If is stopped, should not show backfill popups", () => {
        // Set up - stop the poll
        const newPoll = new Poll(testPoll)
        newPoll.startedAt = null
        newPoll.wasStarted = false

        backfiller.updatePoll(newPoll)

        // Miss a regular popup
        let regularPopup = getPopup(testTimeCollected)
        backfiller.responseMissed(regularPopup)

        // Assert - there should be no popup
        expect(capturedPopups).toHaveLength(0)    
    })

    test("If is started, should show backfill popups", () => {
        // This is already handled by other tests.
    })
})

describe("Handling poll updates", () => {
    test("If the poll desiredFrequency changes, should set new durationMin correctly", () => {
        // Set up - stop the poll
        const newPoll = new Poll(testPoll)
        newPoll.desiredFrequency = '00:05:00'

        backfiller.updatePoll(newPoll)

        // Miss a regular popup. This popup still has the old durationMin.
        let regularPopup = getPopup(testTimeCollected)
        backfiller.responseMissed(regularPopup)

        // Assert
        expect(capturedPopups[0].timeBlockLengthMin).toBe(5)
    })
})

describe("Backfill popup correctness", () => {
    test("Should have backfill question", () => {
        // Act.
        let regularPopup = getPopup(testTimeCollected)
        backfiller.responseMissed(regularPopup)

        // Assert
        expect(capturedPopups[0].question).toBe("What were you doing at 9:00 AM?")
    })

})

// ================== Helpers =================
function getPopup(timeCollected : Date, poll?: Poll) {
    let pollToUse = poll || testPoll

    let popup = new PollPopup({
        timeBlockLengthMin: moment.duration(pollToUse.desiredFrequency).asMinutes(),
        isBackfill: false,
        originatorName: "something",
        question: "asdf",
        timeCollected: timeCollected,
    })

    return popup
}

function advanceTimeMin(amount: number) {
    const now = timeService.now()
    const newNow = moment(now).add(amount, 'minutes').toDate()
    timeService.setNow(newNow)
}