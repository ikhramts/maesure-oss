import { PopupTimer, POPUP_TIMER_ORIGINATOR_NAME } from '../PopupTimer'
import { MockTimerFactory } from 'shared/utils/time/MockTimerFactory';
import { MockTimeService } from 'shared/utils/time/MockTimeService';
import { PollPopup } from 'shared/model/PollPopup';
import { Poll } from 'shared/model/Poll';
import * as moment from 'moment';
import { TimeLogEntry } from 'shared/model/TimeLogEntry';
import { QuestionType } from 'shared/model/QuestionType';
import { User } from 'shared/model/User';
import { AccountType } from 'shared/model/AccountType';

const TEST_NOW = new Date(2019, 5, 8, 9, 0, 0) // month 5 = June

let timerFactory = new MockTimerFactory()
let timeService = new MockTimeService()
timeService.setNow(TEST_NOW)

let capturedPopups : PollPopup[] = []

let popupTimer : PopupTimer

beforeEach(() => { 
    timerFactory = new MockTimerFactory()
    timeService = new MockTimeService()
    timeService.setNow(TEST_NOW)
    
    capturedPopups = []
    
    popupTimer = new PopupTimer(timerFactory, timeService)
    popupTimer.onPopupDue(popup => {capturedPopups.push(popup)})
    popupTimer.updateUser(new User({accountType: AccountType.TEMPORARY}))
})

describe("When the poll is started", () => {
    beforeEach(() => {
        let poll = getTestPoll({
            wasStarted: false,
            startedAt: null
        })

        popupTimer.updatePoll(poll)
    });

    test("After the first popup is shown, do not show it again", () => {
        // Set up
        let newPoll = getTestPoll({
            wasStarted: true,
            startedAt: TEST_NOW
        })
        
        // Act - show the popup right after the poll is started.
        popupTimer.updatePoll(newPoll)
        capturedPopups.length = 0

        // Have a timer elapse shortly after.
        const newTime = moment(timeService.now()).add(20, 'seconds').toDate()
        timeService.setNow(newTime)
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there shoudl not be abother popup.
        expect(capturedPopups).toHaveLength(0)
    })

})

describe("On the day when the poll is started", () => {
    beforeEach(() => {
        // Set up a poll so that normally (if this wasn't the day the poll was started),
        // we'd have a popup on x:x5 min. But the startedAt time will force the popups on
        // x:x0 min instead.
        let poll = getTestPoll({
            activeFrom: '7:05:00',
            activeTo: '17:00:00',
            desiredFrequency: '0:10:00',
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(1, 'hour').toDate()
        })

        popupTimer.updatePoll(poll)
    });

    [
        0,
        29
    ].forEach((secAfterPopupDue) => {
        test("Show popups after every desiredFrequency after the startedAt", () => {
            // Simulate the timer expiring
            const newTime = moment(TEST_NOW).add(secAfterPopupDue, 'seconds').toDate()
            timeService.setNow(newTime)

            // Act - time to check whether it's popup time.
            timerFactory.lastTimer!!.triggerElapsed()

            // Assert - there should be a popup
            expect(capturedPopups).toHaveLength(1)
            expect(capturedPopups[0].timeCollected).toStrictEqual(TEST_NOW)
            expect(capturedPopups[0].timeBlockLengthMin).toBe(10)
        })
    
    });
    
    [
        31,
        150,
        250
    ].forEach((secAfterPopupDue) => {
        test("Do not show the popup between the desiredFrequency marks", () => {
            // Simulate the previous popup check timer expiration
            const prevNow = moment(TEST_NOW).add(secAfterPopupDue - 30, 'seconds').toDate()
            timeService.setNow(prevNow)
            timerFactory.lastTimer!!.triggerElapsed()
            capturedPopups.length = 0

            // Simulate the timer expiring at the test time
            const currentNow = moment(TEST_NOW).add(secAfterPopupDue, 'seconds').toDate()
            timeService.setNow(currentNow)
        
            // Act - time to check whether it's popup time.
            timerFactory.lastTimer!!.triggerElapsed()

            // Assert - should not show a popup
            expect(capturedPopups).toHaveLength(0)
        })
    });

    test("If popup desired frequency changes, and popup becomes due with new frequency, calculate the new desiredFrequency period from startedAt time", () => {
        // Set up - change the poll settings
        let poll = getTestPoll({
            activeFrom: '7:05:00',
            activeTo: '17:00:00',
            desiredFrequency: '0:07:00',
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(1, 'hour').toDate()
        })

        popupTimer.updatePoll(poll)

        // Set the time to when the popup should show up
        const newTime = moment(TEST_NOW).startOf('day').add(moment.duration("9:03:00")).toDate()
        timeService.setNow(newTime)

        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(1)
        expect(capturedPopups[0].timeBlockLengthMin).toBe(7)
        expect(capturedPopups[0].timeCollected).toStrictEqual(newTime)
    })
})

describe("When poll was started before the start of this day", () => {
    beforeEach(() => {
        let poll = getTestPoll({
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)
    });
    
    [
        0,
        29
    ].forEach((secAfterPopupDue) => {
        test("Show the first popup at activeFrom time", () => {
            // Set up
            const newTime = moment(TEST_NOW).add(secAfterPopupDue, 'seconds').toDate()
            timeService.setNow(newTime)

            // Act - trigger check for popup
            timerFactory.lastTimer!!.triggerElapsed()

            // Assert - there should be a popup
            expect(capturedPopups).toHaveLength(1)
            expect(capturedPopups[0].timeCollected).toStrictEqual(TEST_NOW)
        })
    });

    [
        0,
        29
    ].forEach((secAfterPopupDue) => {
        test("When a new period of desiredFrequency passes, show a popup", () => {
            // Set up - move the time forward to just after the popup is due.
            const dueTime = moment(TEST_NOW).add(20, 'minutes').toDate()
            const newTime = moment(dueTime).add(secAfterPopupDue, 'seconds').toDate()
            timeService.setNow(newTime)

            // Act - trigger check for popup
            timerFactory.lastTimer!!.triggerElapsed()

            // Assert - there should be a popup
            expect(capturedPopups).toHaveLength(1)
            expect(capturedPopups[0].timeCollected).toStrictEqual(dueTime)
        })
    });

    [
        31,
        150,
        250
    ].forEach((secAfterPopupDue) => {
        test("Do not show popups between the desiredFrequency marks", () => {
            // Set up
            const dueTime = moment(TEST_NOW).add(20, 'minutes').toDate()
            const currentNow = moment(dueTime).add(secAfterPopupDue, 'seconds').toDate()
            const prevNow = moment(currentNow).subtract(30, 'seconds').toDate()

            // Simulate the previous popup check timer expiration
            timeService.setNow(prevNow)
            timerFactory.lastTimer!!.triggerElapsed()
            capturedPopups.length = 0
            
            // Set up - move the time forward to somewhat after the popup was due.
            timeService.setNow(currentNow)

            // Act - trigger check for popup
            timerFactory.lastTimer!!.triggerElapsed()

            // Assert - there should be a popup
            expect(capturedPopups).toHaveLength(0)
        })
    });
})

describe("When the poll is stopped", () => {
    let poll : Poll
    
    beforeEach(() => {
        poll = getTestPoll({
            activeFrom: "09:00:00", // = TEST_NOW
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)
    });
    
    test("Do not show popups if the poll is stopped", () => {
        // Set up: stop the poll
        let stoppedPoll = getTestPoll({
            activeFrom: "09:00:00", // = TEST_NOW
            wasStarted: false,
            startedAt: null
        })

        popupTimer.updatePoll(stoppedPoll)

        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(0)
    })
    
})

describe("Popup correctness", () => {
    beforeEach(() => {
        let poll = getTestPoll({
            activeFrom: "09:00:00", // = TEST_NOW
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)
    });

    test("Should include the time when the poll was due", () => {
        // This is already covered in other tests        
    })

    test("Should ask the poll question", () => {
        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - the popup has the right text
        expect(capturedPopups[0].question).toBe("What were you doing right before you saw this?")
    })

    test("Should set the originator", () => {
        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - the popup has the right text
        expect(capturedPopups[0].originatorName).toBe(POPUP_TIMER_ORIGINATOR_NAME)
    })
})

describe("Simple vs detailed popups", () => {
    let poll : Poll

    beforeEach(() => {
        poll = getTestPoll({
            activeFrom: "09:00:00", // = TEST_NOW
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)
    });

    test("Should not emit a popup if the latest time log entry is in the future", () => {
        // Set up - there is a response in the future
        const timeLogEntry = new TimeLogEntry({
            fromTime: "2019-06-08 10:00:00", // 1 hr in the future
            timeBlockLength: "00:15:00"
        })

        popupTimer.updateTimeLogEntries([timeLogEntry])

        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be no popup.
        expect(capturedPopups).toHaveLength(0)
    })

    test("If the last response was recently, show a simple popup", () => {
        // Set up - there is a recent response
        const timeLogEntry = new TimeLogEntry({
            fromTime: "2019-06-08 08:30:00", // 30 min in the past
            timeBlockLength: "00:15:00"
        })

        popupTimer.updateTimeLogEntries([timeLogEntry])
        
        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be no popup.
        expect(capturedPopups[0].questionType).toBe(QuestionType.Simple)
    })

    test("If it's been a while since the last response, show a detailed popup", () => {
        // Set up - there is a response from a long time ago
        const timeLogEntry = new TimeLogEntry({
            fromTime: "2019-06-08 01:30:00", // way earlier today
            timeBlockLength: "00:15:00"
        })

        popupTimer.updateTimeLogEntries([timeLogEntry])
        
        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be no popup.
        expect(capturedPopups[0].questionType).toBe(QuestionType.Detailed)
    })

    test("If the poll was recently started, should show a simple popup", () => {
        // Set up - change the poll to be recently started.
        poll.startedAt = moment(TEST_NOW).subtract(30, 'minutes').toDate()

        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be no popup. 
        expect(capturedPopups[0].questionType).toBe(QuestionType.Simple)
    })

    test("If the poll was started long ago and has no recent responses, "
            + "show a detailed popup", () => {
        // Act - trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be no popup.
        expect(capturedPopups[0].questionType).toBe(QuestionType.Detailed)
    })

})

describe("Pause/resume", () => {
    beforeEach(() => {
        let poll = getTestPoll({
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)
    })

    test("If the PopupTimer is paused, should not emit a scheduled popup", () => {
        popupTimer.pause()
        
        // Trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(0)
    })

    test("If the popup is paused and resumed, should emit next scheduled popup", () => {
        popupTimer.pause()
        popupTimer.resume()

        // Trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(1)

    })
})

describe("updateUser()", () => {
    beforeEach(() => {
        let poll = getTestPoll({
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)
    })

    test("If the user AccountType is PRO_TRIAL_ENDED, should not emit popups", () => {
        popupTimer.updateUser(new User({accountType: AccountType.PRO_TRIAL_EXPIRED}))

        // Trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(0)
    });

    test("If the user AccountType is NONE, should not emit popups", () => {
        popupTimer.updateUser(new User({accountType: AccountType.NONE}))

        // Trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(0)
    });

    [
        AccountType.FREE_PERMANENT,
        AccountType.PRO,
        AccountType.PRO_TRIAL,
        AccountType.TEMPORARY,
    ].forEach((accountType) => {
        test("If the user type is not NONE or PRO_TRIAL_ENDED, should emit popups", () => {
            popupTimer.updateUser(new User({accountType: accountType}))

            // Trigger check for popup
            timerFactory.lastTimer!!.triggerElapsed()
    
            // Assert - there should be a popup
            expect(capturedPopups).toHaveLength(1)
        })
    })

    test("If user is null, should not emit popups", () => {
        // Set up a popup timer without a user.
        popupTimer = new PopupTimer(timerFactory, timeService)
        popupTimer.onPopupDue(popup => {capturedPopups.push(popup)})

        let poll = getTestPoll({
            wasStarted: true,
            startedAt: moment(TEST_NOW).subtract(2, 'days').toDate() // Before today
        })

        popupTimer.updatePoll(poll)

        // Trigger check for popup
        timerFactory.lastTimer!!.triggerElapsed()

        // Assert - there should be a popup
        expect(capturedPopups).toHaveLength(0)
    });
})



// ================== Helpers =====================
function getTestPoll(init?: Partial<Poll>) {
    let poll = new Poll({
        activeFrom: "7:00:00",
        activeTo: "19:00:00",
        desiredFrequency: "0:10:00",
        wasStarted: true,
        startedAt: moment(TEST_NOW).subtract(4, 'days').toDate()
    })

    if (init) {
        Object.assign(poll, init)
    }

    return poll
}