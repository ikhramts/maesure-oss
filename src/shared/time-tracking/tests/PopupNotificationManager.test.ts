import { MockNotificationsManager } from "shared/utils/notifications/MockNotificationsManager";
import { MockServiceWorkerProxy } from "shared/utils/service-workers/MockServiceWorkerProxy";
import { PopupNotificationManager, USER_CONFIRMED_DOING_THE_SAME_THING } from "../PopupNotificationManager";
import { Poll } from "shared/model/Poll";
import { PollPopup } from "shared/model/PollPopup";
import { POPUP_TIMER_ORIGINATOR_NAME } from "../popup-management/PopupTimer";
import { PollResponse } from "shared/model/PollResponse";
import { MockTimeService } from "shared/utils/time/MockTimeService";
import * as moment from 'moment'
import { LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME } from "../popup-management/LatestPopupBackfiller";
import { PAST_GAP_BACKFILLER_ORIGINATOR_NAME } from "../popup-management/PastGapBackfiller";
import { TimeLogEntry } from "shared/model/TimeLogEntry";

const TEST_NOW = new Date(2019, 5, 8, 9, 1, 0)
const POLL_DESIRED_INTERVAL_MIN = 15

let capturedResponses : PollResponse[]
let capturedResponsePopups : PollPopup[]

let timeService : MockTimeService
let serviceWorkerProxy: MockServiceWorkerProxy
let notificationManager : MockNotificationsManager

let popupNotificationManager: PopupNotificationManager

beforeEach(() => {
    timeService = new MockTimeService()
    timeService.setNow(TEST_NOW)

    capturedResponses = []
    capturedResponsePopups = []
    const captureResponse = (popup: PollPopup, response: PollResponse) => {
        capturedResponses.push(response)
        capturedResponsePopups.push(popup)
    }

    serviceWorkerProxy = new MockServiceWorkerProxy()
    notificationManager = new MockNotificationsManager()
    popupNotificationManager = 
        new PopupNotificationManager(serviceWorkerProxy, notificationManager, captureResponse)
    popupNotificationManager.updatePoll(new Poll({wasStarted: true}))
})

test("When poll is just started, do not show a notification for the first popup.", () => {
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    expect(notificationManager.lastNotificationTitle).toBeNull()
    expect(notificationManager.lastNotificationOptions).toBeNull()
})

test("After user submits a popup, when a regular popup appears, "
        + "ask whether the user was doing the same thing as last time.", () => {
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])

    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    expect(notificationManager.lastNotificationTitle).toBe("Are you still doing 'Some text'?")
    expect(notificationManager.lastNotificationOptions!!.actions).toHaveLength(2)
    
    const actions = notificationManager.lastNotificationOptions!!.actions!!
    const firstAction = actions[0]
    const secondAction = actions[1]

    expect(firstAction.action).toBe("yes")
    expect(firstAction.title).toBe("Yes")
    expect(secondAction.action).toBe("no")
    expect(secondAction.title).toBe("No")
})

test("If the user clicks 'Yes' on the notification, should submit "
        + "the popup response corresponding to the popup.", () => {
    // User provices some response.
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])

    // Time for the a popup.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    // User clicks on "Yes"
    serviceWorkerProxy.emitEvent('message', { 
            data: { event: USER_CONFIRMED_DOING_THE_SAME_THING}
        })

    // Assert - we have submitted the poll response for the entire preceding period.
    expect(capturedResponses).toHaveLength(1)

    const capturedResponse = capturedResponses[0]
    expect(capturedResponse.responseText).toBe("Some text")
    expect(capturedResponse.timeCollected).toStrictEqual(popup.timeCollected)
    expect(capturedResponse.timeBlockLengthMin).toBe(POLL_DESIRED_INTERVAL_MIN)
})

test("If the user clicks 'Yes' on the notification, and multiple "
        + "responses were missed, should submit the popup response "
        + "corresponding to the entire missed length.", () => {
    // User provices some response.
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])

    // Miss several periods.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN * 3, 'minutes')
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    // User clicks on "Yes"
    serviceWorkerProxy.emitEvent('message', { 
            data: { event: USER_CONFIRMED_DOING_THE_SAME_THING}
        })

    // Assert - we have submitted the poll response for the entire preceding period.
    expect(capturedResponses).toHaveLength(1)

    const capturedResponse = capturedResponses[0]
    const expectedTimeCollected = 
        moment(timeService.now()).add(-POLL_DESIRED_INTERVAL_MIN * 2, 'minutes').toDate()
    expect(capturedResponse.responseText).toBe("Some text")
    expect(capturedResponse.timeCollected).toStrictEqual(expectedTimeCollected)
    expect(capturedResponse.timeBlockLengthMin).toBe(POLL_DESIRED_INTERVAL_MIN * 3)
})

test("When the latest backfill popup appears, ask the user whether they are still "
        + "doing the same thing", () => {
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])

    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    expect(notificationManager.lastNotificationTitle).toBe("Are you still doing 'Some text'?")
    expect(notificationManager.lastNotificationOptions!!.actions).toHaveLength(2)
})

test("Do not show browser notifications for any other types of popups", () => {
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])

    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(PAST_GAP_BACKFILLER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    expect(notificationManager.lastNotificationTitle).toBeNull()
    expect(notificationManager.lastNotificationOptions).toBeNull()
})

test("When the poll is stopped, do not show browser notifications", () => {
    // User provides a response
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])
    
    // Stop the poll
    popupNotificationManager.updatePoll(new Poll({wasStarted: false}))

    // Process a popup that somehow still ended up in the system.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    expect(notificationManager.lastNotificationTitle).toBeNull()
    expect(notificationManager.lastNotificationOptions).toBeNull()
})

test("When the poll is restared, do not show a browser notification "
        + "for the first popup", () => {
    // User provides a response
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])
    
    // Stop the poll
    popupNotificationManager.updatePoll(new Poll({wasStarted: false}))

    // Restart the poll
    popupNotificationManager.updatePoll(new Poll({wasStarted: true}))

    // Start processing the popups again.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    // Assert: should not show the notification for the first poll popup.
    expect(notificationManager.lastNotificationTitle).toBeNull()
    expect(notificationManager.lastNotificationOptions).toBeNull()
})

test("Updating a started poll to a poll that is still started should have no effect", () => {
    // User provides a response
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])
    
    // Some poll update happens
    popupNotificationManager.updatePoll(new Poll({wasStarted: true}))

    // Start processing the popups again.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    // Assert: should behave as if the latest updatePoll() never happened.
    expect(notificationManager.lastNotificationTitle).toBe("Are you still doing 'Some text'?")
    expect(notificationManager.lastNotificationOptions).toBeTruthy()
})


describe("Updating the last response", () => {
    test("When a new response is submitted, and its timeCollected is "
            + "later than any other recent response, should use it in "
            + "the next notification question.", () => {
        // User provides a response
        const response1 = mockResponse("Some text")
        popupNotificationManager.updateLatestResponse([response1])

        // User provides a newer response
        timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
        const response2 = mockResponse("Other text")
        popupNotificationManager.updateLatestResponse([response2])

        // Start processing the next popup.
        timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
        const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
        popupNotificationManager.showPopupNotificationIfNeeded(popup)

        // Assert: should use the latest response. 
        expect(notificationManager.lastNotificationTitle)
            .toBe("Are you still doing 'Other text'?")

        // Keep going: user clicks "Yes"
        serviceWorkerProxy.emitEvent('message', {
                data: { event: USER_CONFIRMED_DOING_THE_SAME_THING}
            })

        // Assert: we submit a response with the latest responseText
        expect(capturedResponses[0].responseText).toBe("Other text")
    })

    test("If multiple responses are submitted together, should use "
            + "the latest one in the next notification question.", () => {

        // Set up: three responses to be submitted at the same time.
        const response1 = mockResponse("a")
        response1.timeCollected = TEST_NOW

        const response2 = mockResponse("b")
        response2.timeCollected = moment(TEST_NOW).add(45, 'minutes').toDate()

        const response3 = mockResponse("c")
        response3.timeCollected = moment(TEST_NOW).add(15, 'minutes').toDate()
        
        // Submit the responses.
        timeService.advance(1, 'hour')
        popupNotificationManager.updateLatestResponse([
            response1, response2, response3
        ])

        // A new popup comes due.
        const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
        popupNotificationManager.showPopupNotificationIfNeeded(popup)

        // Assert - should use the latest response.
        expect(notificationManager.lastNotificationTitle)
            .toBe("Are you still doing 'b'?")
    })

    test("When a new response is submitted and its timeCollected is earlier "
            + "than another response, should not use it in the next "
            + "notification question.", () => {
        // User provides a response
        const response1 = mockResponse("Some text")
        popupNotificationManager.updateLatestResponse([response1])

        // User provides an OLDER response
        const timeCollected2 = moment(timeService.now()).subtract(15, 'minutes').toDate()
        const response2 = 
            new PollResponse({responseText: "Other text", timeCollected: timeCollected2})
        popupNotificationManager.updateLatestResponse([response2])

        // Start processing the next popup.
        timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
        const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
        popupNotificationManager.showPopupNotificationIfNeeded(popup)

        // Assert: should use the latest response. 
        expect(notificationManager.lastNotificationTitle)
            .toBe("Are you still doing 'Some text'?")

        // Keep going: user clicks "Yes"
        serviceWorkerProxy.emitEvent('message', { 
                data: { event: USER_CONFIRMED_DOING_THE_SAME_THING}
            })

        // Assert: we submit a response with the latest responseText
        expect(capturedResponses[0].responseText).toBe("Some text")
    })

    test("When all poll responses are updated, should use the latest response"
            + " among them as in the next notification question.", () => {
        // User provides a response
        const response = mockResponse("Some text")
        popupNotificationManager.updateLatestResponse([response])

        // We load up some more responses from the server.
        const entry1Time = moment(timeService.now()).add(POLL_DESIRED_INTERVAL_MIN, 'minutes')
        const entry2Time = 
            moment(timeService.now()).add(POLL_DESIRED_INTERVAL_MIN * 2, 'minutes')

        const moreResponses = [
            new TimeLogEntry({
                entryText: "Text1",
                timeBlockLength: "" + POLL_DESIRED_INTERVAL_MIN + ":00",
                fromTime: entry1Time.toISOString()
            }),
            new TimeLogEntry({
                entryText: "Text2",
                timeBlockLength: "" + POLL_DESIRED_INTERVAL_MIN + ":00",
                fromTime: entry2Time.toISOString()
            })
        ]

        popupNotificationManager.updateTimeLogEntries(moreResponses)

        // Keep processing popups.
        timeService.advance(POLL_DESIRED_INTERVAL_MIN * 3, 'minutes')
        const popup = mockPopup(POPUP_TIMER_ORIGINATOR_NAME)
        popupNotificationManager.showPopupNotificationIfNeeded(popup)

        // Assert: should use the latest response. 
        expect(notificationManager.lastNotificationTitle).toBe("Are you still doing 'Text2'?")

        // Keep going: user clicks "Yes"
        serviceWorkerProxy.emitEvent('message', { 
                data: { event: USER_CONFIRMED_DOING_THE_SAME_THING}
            })

        // Assert: we submit a response with the latest responseText
        expect(capturedResponses[0].responseText).toBe("Text2")
    })
})

test("If the browser notifications do not support actions, fall back "
        + "to displaying the popup question.", () => {
    // Set up: do not support actions on notifications.
    notificationManager.shouldSupportActions = false

    // User provides a response
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])
    
    // Start processing the popups again.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    // Assert: should show a generic notification without actions.
    expect(notificationManager.lastNotificationOptions!!.body).toBe(popup.question)
    expect(notificationManager.lastNotificationOptions!!.actions).toBeFalsy()
})

test("If the browser notifications support actions, show a richer "
        + "notification with Yes and No actions", () => {
    // Set up: do not support actions on notifications.
    notificationManager.shouldSupportActions = true

    // User provides a response
    const response = mockResponse("Some text")
    popupNotificationManager.updateLatestResponse([response])
    
    // Start processing the popups again.
    timeService.advance(POLL_DESIRED_INTERVAL_MIN, 'minutes')
    const popup = mockPopup(LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME)
    popupNotificationManager.showPopupNotificationIfNeeded(popup)

    // Assert: should show a smarter notification with actions.
    expect(notificationManager.lastNotificationTitle).toBe("Are you still doing 'Some text'?")
    expect(notificationManager.lastNotificationOptions!!.actions).toHaveLength(2)
})

// ================ Helpers ===================

function mockPopup(originatorName: string, timeCollected?: Date, ) : PollPopup {
    if (!timeCollected) {
        timeCollected = timeService.now()
    }

    return new PollPopup({
        timeCollected: timeCollected,
        originatorName: originatorName,
        timeBlockLengthMin: POLL_DESIRED_INTERVAL_MIN,
        question: "Some question"
    })
}

function mockResponse(responseText: string) {
    return new PollResponse({
        responseText: responseText,
        timeCollected: timeService.now(),
        timeBlockLengthMin: POLL_DESIRED_INTERVAL_MIN
    })
}