import * as moment from 'moment'

import { IPopupQueue } from '../IPopupQueue'
import { IPopupTimer } from '../IPopupTimer'
import { IPopupTimeoutTimer } from '../IPopupTimeoutTimer'
import { ILatestPopupBackfiller } from '../ILatestPopupBackfiller'
import { IPastGapBackfiller } from '../IPastGapBackfiller'
import { PollPopup } from 'shared/model/PollPopup'
import { Poll } from 'shared/model/Poll'
import { PollResponse } from 'shared/model/PollResponse'
import { TimeLogEntry } from 'shared/model/TimeLogEntry'
import { PopupService } from '../PopupService'
import { SimpleEmitter } from 'shared/utils/events/SimpleEmitter'
import { MockApiClient } from 'shared/api/MockApiClient'
import { QuestionType } from 'shared/model/QuestionType'
import { User } from 'shared/model/User'

const TEST_NOW = new Date(2019, 12, 20, 9, 0, 0)

let _popupQueue : MockPopupQueue
let _popupTimer: MockPopupTimer
let _popupTimeoutTimer: MockPupupTimeoutTimer
let _latestPopupBackfiller: MockLatestPopupBackfiller
let _pastGapBackfiller: MockPastGapBackfiller
let _apiClient: MockApiClient

let _popupService: PopupService
let _poll: Poll

beforeEach(() => {
    _popupQueue = new MockPopupQueue()
    _popupTimer = new MockPopupTimer()
    _popupTimeoutTimer = new MockPupupTimeoutTimer()
    _latestPopupBackfiller = new MockLatestPopupBackfiller()
    _pastGapBackfiller = new MockPastGapBackfiller()
    _apiClient = new MockApiClient()

    _popupService = new PopupService(_popupQueue,
                                    _popupTimer,
                                    _popupTimeoutTimer,
                                    _latestPopupBackfiller,
                                    _pastGapBackfiller,
                                    _apiClient)

    _poll = new Poll({
        desiredFrequency: "00:10:00",
        startedAt: new Date(2019, 12, 13, 14, 15, 16),
        wasStarted: true
    })
})


describe("updatePoll()", () => {
    test("Should call updatePoll() on sub-services", () => {
        // Act
        _popupService.updatePoll(_poll)

        // Assert - the poll should be passed down.
        expect(_popupQueue.updatePoll.mock.calls[0][0]).toBe(_poll)
        expect(_popupTimer.updatePoll.mock.calls[0][0]).toBe(_poll)
        expect(_latestPopupBackfiller.updatePoll.mock.calls[0][0]).toBe(_poll)
        expect(_pastGapBackfiller.updatePoll.mock.calls[0][0]).toBe(_poll)
    })

    test("If poll is stopped, should remove existing popups", () => {
        // Start with a rnning poll
        _popupService.updatePoll(_poll)
        
        // Emit a popup
        const popup = getPopup()
        _popupQueue.popupDueEvent.emit(popup)

        // Capture the popup reset event.
        let emittedNullPopup = false
        _popupService.onPopupChanged(p => {
            if (!p) {
                emittedNullPopup = true
            }
        })

        // Stop the poll.
        const stoppedPoll = new Poll({
            desiredFrequency: "00:10:00",
            startedAt: null,
            wasStarted: false
        })

        _popupService.updatePoll(stoppedPoll)

        // Assert: PopupService told everyone that the popup was closed.
        expect(emittedNullPopup).toBe(true)
    })
})

describe("updateUser()", () => {
    test("Should call updateUser() on sub-services", () => {
        // Act
        const user = new User();
        _popupService.updateUser(user)

        // Assert - the user should be passed down.
        expect(_popupTimer.updateUser.mock.calls[0][0]).toBe(user)
    })
})

describe("updatePollResponses()", () => {
    test("Should call updatePollResponses() on sub-services", () => {
        // Set up.
        const entries: TimeLogEntry[] = []

        // Act
        _popupService.updateTimeLogEntries(entries)

        // Assert - the poll should be passed down.
        expect(_pastGapBackfiller.updateTimeLogEntries.mock.calls[0][0]).toBe(entries)
        expect(_popupTimer.updateTimeLogEntries.mock.calls[0][0]).toBe(entries)
    })
})

describe("On popupDue events from sub-services", () => {
    beforeEach(() => {
        _popupService.updatePoll(_poll)
    })

    test("Should enqueue popups emitted by PopupTimer", () => {
        const popup = getPopup()
        _popupTimer.popupDueEvent.emit(popup)

        // Assert
        expect(_popupQueue.enqueue.mock.calls[0][0]).toBe(popup)
    })

    test("Should enqueue popups emitted by LatestPopupBackfiller", () => {
        const popup = getPopup()
        _latestPopupBackfiller.popupDueEvent.emit(popup)

        // Assert
        expect(_popupQueue.enqueue.mock.calls[0][0]).toBe(popup)
    })

    test("Should enqueue popups emitted by PastGapBackfiller", () => {
        // Act
        const popup = getPopup()
        _pastGapBackfiller.popupDueEvent.emit(popup)

        // Assert
        expect(_popupQueue.enqueue.mock.calls[0][0]).toBe(popup)
    })
})

describe("On PopupQueue.showPopup", () => {
    const popup = getPopup()

    beforeEach(() => {
        _popupService.updatePoll(_poll)
    })

    test("Should start timing the popup", () => {
        _popupQueue.popupDueEvent.emit(popup)
        expect(_popupTimeoutTimer.startTimingPopup.mock.calls.length).toBe(1)
    })

    test("Emit popupChanged event", () => {
        let emittedPopup : PollPopup | null = null
        _popupService.onPopupChanged(p => emittedPopup = p)

        _popupQueue.popupDueEvent.emit(popup)

        expect(emittedPopup).toBe(popup)
    })

    test("If the new popup is Detailed, should start but disable the timeout", () => {
        const detailedPopup = getPopup()
        detailedPopup.questionType = QuestionType.Detailed
        _popupQueue.popupDueEvent.emit(detailedPopup)

        expect(_popupTimeoutTimer.startTimingPopup.mock.calls.length).toBe(1)
        expect(_popupTimeoutTimer.disableTimeout.mock.calls.length).toBe(1)
    })
})


describe("popupCompleted()", () => {
    let popup : PollPopup

    let responses: PollResponse[] = 

    beforeEach(() => {
        popup = getPopup()
        responses = [new PollResponse({
            responseText: "abc",
            timeBlockLengthMin: 10,
            timeCollected: TEST_NOW
        })]

        _popupService.updatePoll(_poll)
    })

    test("Should stop timing the popup", () => {
        _popupService.popupCompleted(popup, responses)
        expect(_popupTimeoutTimer.endTimingPopup.mock.calls.length).toBe(1)
    })

    test("Should emit popupChanged with null popup", () => {
        let emittedPopup : PollPopup | null = popup // something that's not null
        _popupService.onPopupChanged(p => emittedPopup = p)

        _popupService.popupCompleted(popup, responses)

        expect(emittedPopup).toBe(null)
    })

    test("Should notify PopupQueue that the popup is done", () => {
        _popupService.popupCompleted(popup, responses)

        expect(_popupQueue.markCurrentPopupDone.mock.calls.length).toBe(1)
    })

    test("Should update the LatestPopupBackfiller", () => {
        _popupService.popupCompleted(popup, responses)

        expect(_latestPopupBackfiller.responseCollected.mock.calls[0][0]).toBe(popup)
    })

    test("If PastGapFiller prevented submission, should not emit popupCompleted "
            + "or save the response", () => {
        // Set up - have the pastGapBackfiller return null.
        _pastGapBackfiller.processCollectedResponse = jest.fn((p, r) => null)
        
        // Set up check whether the response was saved.
        let responseSaved = false
        _apiClient.createPollResponse = resp => {
            responseSaved = true
            return Promise.resolve()
        }

        // Set up a check whether the popup was emitted.
        let emittedReponses : PollResponse[] | null = null
        _popupService.onPopupResponseReceived(resps => emittedReponses = resps)

        // Act
        _popupService.popupCompleted(popup, responses)

        // Assert - nothign should be changed.
        expect(responseSaved).toBe(false)
        expect(emittedReponses).toBeNull()
    })

    test("If PastGapFiller allowed submission, emit and save the response", () => {
        // Set up - have the PastGapBacfiller emit its own response.
        const backfillerResponse = new PollResponse({
            responseText: "backfillerResponse",
            timeBlockLengthMin: 10,
            timeCollected: TEST_NOW
        })
        _pastGapBackfiller.processCollectedResponse = jest.fn((p, r) => [backfillerResponse])
        
        // Set up check whether the response was saved.
        let responseSaved : PollResponse | null = null
        _apiClient.createPollResponses = resps => {
            responseSaved = resps[0]
            return Promise.resolve()
        }

        // Set up a check whether the popup was emitted.
        let emittedReponse : PollResponse | null = null
        _popupService.onPopupResponseReceived(resps => emittedReponse = resps[0])

        // Act
        _popupService.popupCompleted(popup, responses)

        // Assert - nothign should be changed.
        expect(responseSaved).toBe(backfillerResponse)
        expect(emittedReponse).toBe(backfillerResponse)
    })

    test("If a Detailed popup is completed, should clear the queue up to "
            + " that popup's latest toTime", () => {
        
        // Set up - detailed question with a couple rows of responses.
        popup.questionType = QuestionType.Detailed
        
        responses = [new PollResponse({
                responseText: "abc",
                timeBlockLengthMin: 10,
                timeCollected: TEST_NOW
            }), new PollResponse({
                responseText: "abc",
                timeBlockLengthMin: 10,
                timeCollected: moment(TEST_NOW).add(20, 'minutes').toDate()
            }), ]

        // Act
        _popupService.popupCompleted(popup, responses)

        // Assert
        // expect(_popupQueue.clearPopupsBefore.mock.calls.length).toBe(1)
        // const cutoffTime = _popupQueue.clearPopupsBefore.mock.calls[0][0]
        // const expectedCutoffTime = moment(TEST_NOW).add(30, 'minutes').toDate()
        // expect(cutoffTime).toStrictEqual(expectedCutoffTime)
        expect(_popupQueue.clear.mock.calls.length).toBe(1)
    })
})

describe("On PopupTimeoutTimer.popupTimedOut", () => {
    const popup = getPopup()

    beforeEach(() => {
        _popupService.updatePoll(_poll)
        _popupQueue.popupDueEvent.emit(popup)
    })

    test("Should emit popupChanged with null popup", () => {
        // Set up
        let emittedPopup : PollPopup | null = popup // something that's not null
        _popupService.onPopupChanged(p => emittedPopup = p)

        // Force a "popup missed" event
        _popupTimeoutTimer.popupTimedOutEvent.emit()

        // Assert
        expect(emittedPopup).toBe(null)
    })

    test("Should notify sub-services that the popup was missed or done", () => {
        // Start the popup.
        _popupQueue.popupDueEvent.emit(popup)

        // Force a "popup missed" event
        _popupTimeoutTimer.popupTimedOutEvent.emit()

        // Assert - the sub-services were notified
        expect(_popupQueue.markCurrentPopupDone.mock.calls.length).toBe(1)
        expect(_latestPopupBackfiller.responseMissed.mock.calls[0][0]).toBe(popup)
        expect(_pastGapBackfiller.responseMissed.mock.calls[0][0]).toBe(popup)
    })
})

describe("showNow()", () => {
    beforeEach(() => {
        _popupService.updatePoll(_poll)
    })

    test("Should ask popupTimer to emit a popup", () => {
        // Act
        _popupService.showNow()

        // Assert
        expect(_popupTimer.showNow.mock.calls.length).toBe(1)
    })

    test("Should pass requested text if it exists", () => {
        // Act
        _popupService.showNow("abc")

        // Assert
        expect(_popupTimer.showNow.mock.calls[0][0]).toBe("abc")
    })

})

describe("switchToDetailedPopup()", () => {
    let popup : PollPopup

    beforeEach(() => {
        _popupService.updatePoll(_poll)

        popup = new PollPopup({
            isBackfill: false,
            question: "abcd",
            questionType: QuestionType.Simple,
            timeCollected: TEST_NOW,
            originatorName: "QWER",
            timeBlockLengthMin: 11
        })
    })

    test("If a simple popup is outstanding, enqueue a detailed popup and close this popup.", () => {
        // Set up: emit the popup.
        _popupQueue.popupDueEvent.emit(popup)

        // Set up to capture the switch in the popup.
        let emittedPopup : PollPopup | null = null
        _popupService.onPopupChanged(p => emittedPopup = p)

        // Act
        _popupService.switchToDetailedPopup()

        // Assert
        expect(emittedPopup).not.toBe(null)

        expect(emittedPopup!.questionType).toBe(QuestionType.Detailed)
        expect(emittedPopup!.isBackfill).toBe(popup.isBackfill)
        expect(emittedPopup!.question).toBe(popup.question)
        expect(emittedPopup!.timeCollected).toBe(popup.timeCollected)
        expect(emittedPopup!.originatorName).toBe(popup.originatorName)
        expect(emittedPopup!.timeBlockLengthMin).toBe(popup.timeBlockLengthMin)
    })

    test("If a simple popup is outstanding, stop timing the popup.", () => {
        // Act
        _popupQueue.popupDueEvent.emit(popup)
        _popupService.switchToDetailedPopup()

        // Assert
        expect(_popupTimeoutTimer.disableTimeout.mock.calls.length).toBe(1)
    })

    test("If a detailed popup is outstanding, do not make popup changes.", () => {
        // Set up: a detailed popup.
        popup = new PollPopup({
            isBackfill: false,
            question: "abcd",
            questionType: QuestionType.Detailed
        })

        _popupQueue.popupDueEvent.emit(popup)
        jest.clearAllMocks() // The above line may count towards some mock calls.

        // Set up to capture the switch in the popup.
        let popupChangedInvoked = false
        _popupService.onPopupChanged(p => popupChangedInvoked = true)

        // Act.
        _popupService.switchToDetailedPopup()

        // Assert - nothing should have happened.
        expect(_popupQueue.enqueue.mock.calls.length).toBe(0)
        expect(_popupTimeoutTimer.disableTimeout.mock.calls.length).toBe(0)
        expect(popupChangedInvoked).toBe(false)
    })

    test("If there is no popup outstanding, do nothing.", () => {
        // Do not start any popup during the setup.

        // Set up to capture the switch in the popup.
        let popupChangedInvoked = false
        _popupService.onPopupChanged(p => popupChangedInvoked = true)

        // Act.
        _popupService.switchToDetailedPopup()

        // Assert - nothing should have happened.
        expect(_popupQueue.enqueue.mock.calls.length).toBe(0)
        expect(_popupTimeoutTimer.disableTimeout.mock.calls.length).toBe(0)
        expect(popupChangedInvoked).toBe(false)
    })
})

describe("switchToSimplePopup()", () => {
    let popup : PollPopup

    beforeEach(() => {
        _popupService.updatePoll(_poll)

        popup = new PollPopup({
            isBackfill: false,
            question: "abcd",
            questionType: QuestionType.Detailed,
            timeCollected: TEST_NOW,
            originatorName: "QWER",
            timeBlockLengthMin: 11
        })
    })

    test("If a detailed popup is outstanding, enqueue a simple popup and hide this one.", () => {
        // Set up: emit the popup.
        _popupQueue.popupDueEvent.emit(popup)

        // Set up to capture the switch in the popup.
        let emittedPopup : PollPopup | null = null
        _popupService.onPopupChanged(p => emittedPopup = p)

        // Act
        _popupService.switchToSimplePopup()

        // Assert
        expect(emittedPopup).not.toBe(null)

        expect(emittedPopup!.questionType).toBe(QuestionType.Simple)
        expect(emittedPopup!.isBackfill).toBe(popup.isBackfill)
        expect(emittedPopup!.question).toBe(popup.question)
        expect(emittedPopup!.timeCollected).toBe(popup.timeCollected)
        expect(emittedPopup!.originatorName).toBe(popup.originatorName)
        expect(emittedPopup!.timeBlockLengthMin).toBe(popup.timeBlockLengthMin)
    })

    test("If a detailed popup is outstanding, start timing the popup again", () => {
        // Act
        _popupQueue.popupDueEvent.emit(popup)
        _popupService.switchToSimplePopup()

        // Assert
        expect(_popupTimeoutTimer.enableTimeout.mock.calls.length).toBe(1)
    })

    test("If a simple popup is outstanding, do not make popup changes.", () => {
        // Set up: a detailed popup.
        popup = new PollPopup({
            isBackfill: false,
            question: "abcd",
            questionType: QuestionType.Simple
        })

        _popupQueue.popupDueEvent.emit(popup)

        // Set up to capture the switch in the popup.
        let popupChangedInvoked = false
        _popupService.onPopupChanged(p => popupChangedInvoked = true)

        // Act.
        _popupService.switchToSimplePopup()

        // Assert - nothing should have happened.
        expect(_popupQueue.enqueue.mock.calls.length).toBe(0)
        expect(_popupTimeoutTimer.enableTimeout.mock.calls.length).toBe(0)
        expect(popupChangedInvoked).toBe(false)

    })

    test("If there is no popup outstanding, do nothing.", () => {
        // Do not start any popup during the setup.

        // Set up to capture the switch in the popup.
        let popupChangedInvoked = false
        _popupService.onPopupChanged(p => popupChangedInvoked = true)

        // Act.
        _popupService.switchToSimplePopup()

        // Assert - nothing should have happened.
        expect(_popupQueue.enqueue.mock.calls.length).toBe(0)
        expect(_popupTimeoutTimer.disableTimeout.mock.calls.length).toBe(0)
        expect(popupChangedInvoked).toBe(false)
    })
})

describe("userInteractedWithPopup()", () => {
    beforeEach(() => {
        _popupService.updatePoll(_poll)
    })

    test("Should ask PopupTimeoutTimer to extend the grace period", () => {
        _popupService.userInteractedWithPopup()
        expect(_popupTimeoutTimer.resetGracePeriod.mock.calls.length).toBe(1)
    })
})

// describe("pause()/resume()", () => {
//     test("Should forward pause() to sub-services", () => {
//         _popupService.pause()
//         expect(_popupTimer.pause).toHaveBeenCalledTimes(1)
//     })

//     test("On pause(), should clear the popup shown to the user", () => {

//     })

//     test("Should forward resume() to sub-services", () => {
//         _popupService.resume()
//         expect(_popupTimer.resume).toHaveBeenCalledTimes(1)
//     })
// })

// ======================== Helpers ======================

class MockPopupQueue implements IPopupQueue {
    onPopupDue = jest.fn((handler: (popup:PollPopup) => void) => {
        this.popupDueEvent.addHandler(handler)
    })

    enqueue = jest.fn((popup: PollPopup) => {})
    markCurrentPopupDone = jest.fn(() => {})
    clearPopupsBefore = jest.fn((cutoffTime: Date) => {})
    clear = jest.fn(() => {})
    updatePoll = jest.fn((poll: Poll) => {})

    popupDueEvent = new SimpleEmitter<PollPopup>()
}

class MockPopupTimer implements IPopupTimer {
    onPopupDue = jest.fn((handler: (popup:PollPopup) => void) => {
        this.popupDueEvent.addHandler(handler)
    })

    updatePoll = jest.fn((poll: Poll) => {})
    updateUser = jest.fn((poll: User) => {})
    updateTimeLogEntries = jest.fn((pollResponses: TimeLogEntry[]) => {})
    showNow = jest.fn((suggestedResponse?: string) => {})
    pause = jest.fn(() => {})
    resume = jest.fn(() => {})

    popupDueEvent = new SimpleEmitter<PollPopup>()
}

class MockPupupTimeoutTimer implements IPopupTimeoutTimer {
    onPopupTimedOut = jest.fn((handler: () => void) => {
        this.popupTimedOutEvent.addHandler(handler)
    })
    startTimingPopup = jest.fn(() => {})
    resetGracePeriod = jest.fn(() => {})
    endTimingPopup = jest.fn(() => {})
    disableTimeout = jest.fn(() => {})
    enableTimeout = jest.fn(() => {})

    popupTimedOutEvent = new SimpleEmitter<void>()
}

class MockLatestPopupBackfiller implements ILatestPopupBackfiller {
    onPopupDue = jest.fn((handler: (popup:PollPopup) => void) => {
        this.popupDueEvent.addHandler(handler)
    })

    updatePoll = jest.fn((poll: Poll) => {})
    responseCollected = jest.fn((popup: PollPopup) => {})
    responseMissed = jest.fn((popup: PollPopup) => {})

    popupDueEvent = new SimpleEmitter<PollPopup>()
}

class MockPastGapBackfiller implements IPastGapBackfiller {
    onPopupDue = jest.fn((handler: (popup:PollPopup) => void) => {
        this.popupDueEvent.addHandler(handler)
    })

    updatePoll = jest.fn((poll: Poll) => {})
    processCollectedResponse = 
        jest.fn((popup: PollPopup, responses: PollResponse[]) : PollResponse[] | null => { 
            return null
        })
    responseMissed = jest.fn((popup: PollPopup) => {})
    updateTimeLogEntries = jest.fn((pollResponses: TimeLogEntry[]) => {})

    popupDueEvent = new SimpleEmitter<PollPopup>()
}

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