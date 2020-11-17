import { IServiceWorkerProxy } from "shared/utils/service-workers/IServiceWorkerProxy";
import { PollResponse } from "shared/model/PollResponse";
import { PollPopup } from "shared/model/PollPopup";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import { Poll } from "shared/model/Poll";
import { INotificationsManager } from "shared/utils/notifications/INotificationsManager";
import * as moment from 'moment'
import { POPUP_TIMER_ORIGINATOR_NAME } from "./popup-management/PopupTimer";
import { LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME } from "./popup-management/LatestPopupBackfiller";
import { SubmissionType } from "shared/model/SubmissionTypes";

export const USER_CONFIRMED_DOING_THE_SAME_THING = "USER_CONFIRMED_DOING_THE_SAME_THING"

export class PopupNotificationManager {
    constructor(serviceWorker: IServiceWorkerProxy, notificationsManager: INotificationsManager, 
        submitResponse: (popup: PollPopup, response: PollResponse) => void) {
        this._serviceWorker = serviceWorker
        this._notificationsManager = notificationsManager
        this._submitResponse = submitResponse

        this.onPostMessageFromServiceWorker = this.onPostMessageFromServiceWorker.bind(this)

        this._serviceWorker.addEventListener('message', this.onPostMessageFromServiceWorker)
    }

    showPopupNotificationIfNeeded(popup: PollPopup) : void {
        // If the poll is not running, don't show anything.
        if (!this._poll || !this._poll.wasStarted) {
            return
        }

        // If this is the first popup after the poll was started, don't show anything.
        if (!this._latestResponse) {
            return
        }

        // Show notifications only for specific popups.
        if (popup.originatorName != POPUP_TIMER_ORIGINATOR_NAME
                && popup.originatorName != LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME) {

            return
        }

        // Try to show the notification.
        this._currentPopup = popup
        const lastResponseText = this._latestResponse.responseText

        if (this._notificationsManager.supportsActions()) {
            this._notificationsManager.showRichNotificationIfTabIsNotActive("Are you still doing '" + lastResponseText + "'?", {
                silent: true,
                icon: "/icon-1024.png",
                actions: [
                    {
                        action: 'yes',
                        title: 'Yes'
                    },
                    {
                        action: 'no',
                        title: 'No'
                    },
                ]
            } as any)
    
        } else {
            this._notificationsManager.showRichNotificationIfTabIsNotActive("  Maesure says:", {
                body: popup.question,
                silent: true,
                icon: "/icon-1024.png",
            })
        }
    }

    updateLatestResponse(pollResponses: PollResponse[]) {
        // Keep track of the latest response submitted by the user.
        // We'll need it mostly for the responseText, but we'll use
        // its timing as well.
        if (!this._poll || !this._poll.wasStarted) {
            return
        }

        // First, figure out which response is the latest.
        let latestToTime = Number.MIN_SAFE_INTEGER
        let latestResponse : PollResponse | null = null

        for(const response of pollResponses) {
            const toTime = response.timeCollected.getTime() 
                            + response.timeBlockLengthMin * 60 * 1000
                
            if (toTime > latestToTime) {
                latestToTime = toTime
                latestResponse = response
            }
        }

        if (latestResponse == null) {
            // The array was empty
            return
        }

        // Save the response - but only if it's later than the latest response
        // we've ever seen.
        if (!this._latestResponse) {
            this._latestResponse = latestResponse
            return
        }

        const latestResponseTime = this._latestResponse.timeCollected.getTime()
        
        if (latestResponse.timeCollected.getTime() > latestResponseTime) {
            this._latestResponse = latestResponse
        }
    }

    updateTimeLogEntries(pollResponses: TimeLogEntry[]) {
        // Keep track of the latest response submitted by the user.
        // We'll need it mostly for the responseText, but we'll use
        // its timing as well.
        
        if (!pollResponses || pollResponses.length == 0 || !this._poll || !this._poll.wasStarted) {
            return
        }

        // Find the latest response in the data set.
        let latestLogEntry = pollResponses[0]
        let latestTime = latestLogEntry.getFromTimeAsDate().getTime()

        for (const pollResponse of pollResponses) {
            const thisResponseTime = pollResponse.getFromTimeAsDate().getTime()

            if (pollResponse.getFromTimeAsDate().getTime() > latestTime) {
                latestTime = thisResponseTime
                latestLogEntry = pollResponse
            }
        }

        // Data from the server overrides any data we may have on the client.
        this._latestResponse = new PollResponse({
            responseText: latestLogEntry.entryText,
            timeBlockLengthMin: latestLogEntry.getTimeBlockLengthMin(),
            timeCollected: latestLogEntry.getFromTimeAsDate()
        })
    }

    updatePoll(poll: Poll) {
        const oldPoll = this._poll
        this._poll = poll

        // Clear everything after a restart of the poll.
        if (oldPoll && !oldPoll.wasStarted && poll.wasStarted) {
            this._latestResponse = null
            this._currentPopup = null
        }
    }

    // ================= Private =================
    private _serviceWorker: IServiceWorkerProxy
    private _notificationsManager: INotificationsManager
    private _submitResponse: (popup: PollPopup, response: PollResponse) => void

    private _poll: Poll | null = null
    private _latestResponse: PollResponse | null = null
    private _currentPopup: PollPopup | null = null

    private onPostMessageFromServiceWorker(evt: any) {
        // User has probably clicked "Yes" in response to "Were you still doing '___'?"
        // Submit the response.

        // First, some defensive validation.
        if (!evt || !evt.data || !evt.data.event) {
            return 
        }

        if (evt.data.event !== USER_CONFIRMED_DOING_THE_SAME_THING) {
            return
        }

        if (!this._poll || !this._poll.wasStarted) {
            return
        }

        const latestResponse = this._latestResponse
        const currentPopup = this._currentPopup

        if (!latestResponse || !currentPopup) {
            return
        }

        // Prepare and submit the response.
        // To do that, calculate the timeCollected and the time block length.
        const timeCollected = moment(latestResponse.timeCollected)
                             .add(latestResponse.timeBlockLengthMin, 'minutes')
                             .toDate()
        const timeCollectedEpoch = timeCollected.getTime()
        const popupTimeCollectedEpoch = currentPopup.timeCollected.getTime()

        const additionalTimeBlockLengthMin = 
            Math.round((popupTimeCollectedEpoch - timeCollectedEpoch) / 1000 / 60)
        const timeBlockLengthMin = 
            currentPopup.timeBlockLengthMin + additionalTimeBlockLengthMin

        const response = new PollResponse({
            responseText: latestResponse.responseText,
            timeBlockLengthMin: timeBlockLengthMin,
            timeCollected: timeCollected,
            submissionType: SubmissionType.BROWSER_NOTIFICATION,
        })
        
        if (this._submitResponse) {
            this._submitResponse(currentPopup, response)
        }
    }
}