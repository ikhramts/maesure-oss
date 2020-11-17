import { MockTimerFactory } from "shared/utils/time/MockTimerFactory";
import { MockTimeService } from "shared/utils/time/MockTimeService";
import { PollPopup } from "shared/model/PollPopup";
import { PopupQueue, WAIT_BETWEEN_POPUPS_MSEC } from "../PopupQueue";
import * as moment from 'moment'
import { POPUP_TIMEOUT_MSEC } from "../PopupTimeoutTimer";
import { Poll } from "shared/model/Poll";

const TEST_NOW = new Date(2019, 5, 8, 9, 1, 0)
let timerFactory: MockTimerFactory
let timeService : MockTimeService

let capturedPopups : PollPopup[]
let popupQueue: PopupQueue

beforeEach(() => {
    timerFactory = new MockTimerFactory()
    timeService = new MockTimeService()
    timeService.setNow(TEST_NOW)

    capturedPopups = []
    popupQueue = new PopupQueue(timerFactory, timeService)
    popupQueue.onPopupDue(popup => {capturedPopups.push(popup)})
    popupQueue.updatePoll(new Poll({wasStarted: true}))
})

test("If there are no popups and a popup is queued, should show it immediately", () => {
    const popup = getPopup()
    popupQueue.enqueue(popup)
    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0]).toBe(popup)
})

test("If two popups are queued, should show only the first one", () => {
    const popup1 = getPopup()
    popup1.question = "a"
    const popup2 = getPopup()
    popup2.question = "b"

    popupQueue.enqueue(popup1)
    popupQueue.enqueue(popup2)

    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0].question).toBe("a")
})

test("If two popups are queued and the first one is marked done, then should wait a bit and show the second one", () => {
    // Enqueue two popups.
    const popup1 = getPopup()
    popup1.question = "a"
    const popup2 = getPopup()
    popup2.question = "b"

    popupQueue.enqueue(popup1)
    popupQueue.enqueue(popup2)

    capturedPopups.length = 0

    // Mark one as done.
    popupQueue.markCurrentPopupDone()

    // Assert - should not show the next popup right away
    expect(capturedPopups).toHaveLength(0)

    // Let some time pass
    const lastTimer = timerFactory.lastTimer
    lastTimer!!.triggerElapsed()

    // Assert - the second popup should show up.
    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0].question).toBe("b")
})

test("If a popup was shown and then done, and then another popup is queued a while later, should show the second one immediately", () => {
    // Cycle through the first popup.
    const popup1 = getPopup()
    popup1.question = "a"
    popupQueue.enqueue(popup1)
    popupQueue.markCurrentPopupDone()

    capturedPopups.length = 0

    // Enqueue the second popup.
    timeService.advance(WAIT_BETWEEN_POPUPS_MSEC + 20, 'milliseconds')
    const popup2 = getPopup()
    popup2.question = "b"
    popupQueue.enqueue(popup2)

    // Assert - the second popup should be emitted right away.
    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0].question).toBe("b")
})

test("If a popup was shown and then done, and then another popup is queued almost immediately, should wait a bit and then show the second popup", () => {
    // Cycle through the first popup.
    const popup1 = getPopup()
    popup1.question = "a"
    popupQueue.enqueue(popup1)
    popupQueue.markCurrentPopupDone()

    capturedPopups.length = 0

    // Enqueue the second popup.
    timeService.advance(WAIT_BETWEEN_POPUPS_MSEC - 1, 'milliseconds')
    const popup2 = getPopup()
    popup2.question = "b"
    popupQueue.enqueue(popup2)

    // Assert - the second popup should not be shown.
    expect(capturedPopups).toHaveLength(0)

    // Some more time passes
    const lastTimer = timerFactory.lastTimer
    lastTimer!!.triggerElapsed()

    // Assert - the second popup should now be emitted.
    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0].question).toBe("b")
})

test("If a popup has been in queue longer than allowed popup time, should not show it", () => {
    // Enqueue two popups.
    const popup1 = getPopup()
    popup1.question = "a"
    const popup2 = getPopup()
    popup2.question = "b"

    popupQueue.enqueue(popup1)
    popupQueue.enqueue(popup2)

    capturedPopups.length = 0

    // Wait a bit too long.
    const newNow = moment(TEST_NOW).add(POPUP_TIMEOUT_MSEC + 1, 'milliseconds').toDate()
    timeService.setNow(newNow)

    // Complete the first popup and wait for a while.
    popupQueue.markCurrentPopupDone()
    const lastTimer = timerFactory.lastTimer

    if (lastTimer) { // We may have cleaned it up already
        lastTimer.triggerElapsed()
    }

    // Assert - there should not be a second poup.
    expect(capturedPopups).toHaveLength(0)
})

test("If the poll is stopped, should stop showing popups", () => {
    // Enqueue two popups.
    const popup1 = getPopup()
    popup1.question = "a"
    const popup2 = getPopup()
    popup2.question = "b"

    popupQueue.enqueue(popup1)
    popupQueue.enqueue(popup2)

    capturedPopups.length = 0

    // Stop the poll
    popupQueue.updatePoll(new Poll({wasStarted: false}))

    // Complete the first popup and wait for a while.
    popupQueue.markCurrentPopupDone()
    const lastTimer = timerFactory.lastTimer

    if (lastTimer) { // We may have cleaned it up already
        lastTimer.triggerElapsed()
    }

    // Assert - there should not be a second poup.
    expect(capturedPopups).toHaveLength(0)
})

test("When there are queued popups, and the poll is stopped and then started, should show the first new popup immediately.", () => {
    // Enqueue two popups.
    const popup1 = getPopup()
    popup1.question = "a"
    const popup2 = getPopup()
    popup2.question = "b"

    popupQueue.enqueue(popup1)
    popupQueue.enqueue(popup2)

    capturedPopups.length = 0

    // Stop the poll.
    popupQueue.updatePoll(new Poll({wasStarted: false}))

    //Start the poll again.
    popupQueue.updatePoll(new Poll({wasStarted: true}))
    
    // Enqueue a new popup.
    const popup3 = getPopup()
    popup3.question = "c"
    popupQueue.enqueue(popup3)

    // Assert - the new popup should be emitted immediately.
    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0].question).toBe("c")
})

test("Updating a poll that remains started should have no effect", () => {
    // This is one of the above scenarios, except with
    // this line added all over the place:
    //
    //     popupQueue.updatePoll(new Poll({wasStarted: true}))

    // Enqueue two popups.
    const popup1 = getPopup()
    popup1.question = "a"
    const popup2 = getPopup()
    popup2.question = "b"

    popupQueue.enqueue(popup1)
    popupQueue.updatePoll(new Poll({wasStarted: true}))
    popupQueue.enqueue(popup2)

    capturedPopups.length = 0

    // Mark one as done.
    popupQueue.updatePoll(new Poll({wasStarted: true}))
    popupQueue.markCurrentPopupDone()

    // Assert - should not show the next popup right away
    expect(capturedPopups).toHaveLength(0)

    // Let some time pass
    popupQueue.updatePoll(new Poll({wasStarted: true}))
    const lastTimer = timerFactory.lastTimer
    lastTimer!!.triggerElapsed()

    // Assert - the second popup should show up.
    expect(capturedPopups).toHaveLength(1)
    expect(capturedPopups[0].question).toBe("b")
})

describe("clearPopupsBefore()", () => {
    beforeEach(() => {
        // Enqueue two popups. The first one will immediately appear, 
        // the second one will be queued.
        const popup1 = getPopup()
        popup1.question = "a"
        popupQueue.enqueue(popup1)
        capturedPopups.length = 0

        const popup2 = getPopup()
        popup2.timeCollected = moment(TEST_NOW).add(15, 'minutes').toDate()
        popup2.question = "b"
        popupQueue.enqueue(popup2)
    })

    test("Should remove popups with popup fromTime < cutoffTime", () => {
        // Clear the popups with cutoffTime AFTER the second popup's fromTime.
        const cutoffTime = moment(TEST_NOW).add(20, 'minutes').toDate()
        popupQueue.clearPopupsBefore(cutoffTime)

        // Dismiss the first popup.
        popupQueue.markCurrentPopupDone()
        const lastTimer = timerFactory.lastTimer
        lastTimer?.triggerElapsed()
    
        // Assert - the second popup should not appear.
        expect(capturedPopups).toHaveLength(0)
    })

    test("Should not remove popups with popup fromTime > cutoffTime", () => {
        // Clear the popups with cutoffTime BEFORE the second popup's fromTime.
        const cutoffTime = moment(TEST_NOW).add(12, 'minutes').toDate()
        popupQueue.clearPopupsBefore(cutoffTime)

        // Dismiss the first popup.
        popupQueue.markCurrentPopupDone()
        const lastTimer = timerFactory.lastTimer
        lastTimer?.triggerElapsed()
    
        // Assert - the second popup should not appear.
        expect(capturedPopups).toHaveLength(1)
    })

    test("Should not remove popups with popup fromTime = cutoffTime", () => {
        // Clear the popups with cutoffTime EQUAL TO the second popup's fromTime.
        const cutoffTime = moment(TEST_NOW).add(15, 'minutes').toDate()
        popupQueue.clearPopupsBefore(cutoffTime)

        // Dismiss the first popup.
        popupQueue.markCurrentPopupDone()
        const lastTimer = timerFactory.lastTimer
        lastTimer?.triggerElapsed()
    
        // Assert - the second popup should not appear.
        expect(capturedPopups).toHaveLength(1)
    })
})

// ================= Helpers =================
function getPopup() {

    let popup = new PollPopup({
        timeBlockLengthMin: 10,
        isBackfill: false,
        originatorName: "something",
        question: "asdf",
        timeCollected: TEST_NOW,
    })

    return popup
}