import { IPopupServiceProxy } from "./IPopupServiceProxy";
import { PollPopup } from "shared/model/PollPopup";
import { PollResponse } from "shared/model/PollResponse";
import { Poll } from "shared/model/Poll";
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";
import { IPopupQueue } from "./IPopupQueue";
import { IPopupTimer } from "./IPopupTimer";
import { IPopupTimeoutTimer } from "./IPopupTimeoutTimer";
import { ILatestPopupBackfiller } from "./ILatestPopupBackfiller";
import { IPastGapBackfiller } from "./IPastGapBackfiller";
import { IApiClient } from "shared/api/IApiClient";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import { QuestionType } from "shared/model/QuestionType";
import { User } from "shared/model/User";

export class PopupService implements IPopupServiceProxy {

    // Next: inject dependencies
    constructor(popupQueue: IPopupQueue,
                popupTimer: IPopupTimer,
                popupTimeoutTimer: IPopupTimeoutTimer,
                latestPopupBackfiller: ILatestPopupBackfiller,
                pastGapBackfiller: IPastGapBackfiller,
                apiClient: IApiClient) {

        // Bindings
        this.onPopupChanged = this.onPopupChanged.bind(this)
        this.onPopupResponseReceived = this.onPopupResponseReceived.bind(this)
        this.updatePoll = this.updatePoll.bind(this)
        this.updateTimeLogEntries = this.updateTimeLogEntries.bind(this)
        this.popupCompleted = this.popupCompleted.bind(this)
        this.showNow = this.showNow.bind(this)
        this.switchToDetailedPopup = this.switchToDetailedPopup.bind(this)
        this.switchToSimplePopup = this.switchToSimplePopup.bind(this)
        this.userInteractedWithPopup = this.userInteractedWithPopup.bind(this)

        this.popupDue = this.popupDue.bind(this)
        this.popupMissed = this.popupMissed.bind(this)

        // Wire up the services
        this._popupQueue = popupQueue
        this._popupTimer = popupTimer
        this._popupTimeoutTimer = popupTimeoutTimer
        this._latestPopupBackfiller = latestPopupBackfiller
        this._pastGapBackfiller = pastGapBackfiller
        this._apiClient = apiClient

        this._popupTimer.onPopupDue(this._popupQueue.enqueue)
        this._latestPopupBackfiller.onPopupDue(this._popupQueue.enqueue)
        this._pastGapBackfiller.onPopupDue(this._popupQueue.enqueue)
        this._popupQueue.onPopupDue(this.popupDue)
        this._popupTimeoutTimer.onPopupTimedOut(this.popupMissed)
    }

    onPopupChanged(handler: (popup: PollPopup | null) => void) {
        this._onPopupChanged.addHandler(handler)
    }

    onPopupResponseReceived(handler: (responses:PollResponse[]) => void) : void {
        this._onPopupResponseReceived.addHandler(handler)
    }

    updatePoll(poll: Poll) : void {
        this._popupQueue.updatePoll(poll)
        this._popupTimer.updatePoll(poll)
        this._latestPopupBackfiller.updatePoll(poll)
        this._pastGapBackfiller.updatePoll(poll)

        if (!poll.wasStarted) {
            this._currentPopup = null
            this._onPopupChanged.emit(null)
        }
    }

    updateUser(user: User) : void {
        this._popupTimer.updateUser(user)
    }

    updateTimeLogEntries(timeLogEntries: TimeLogEntry[]): void {
        this._pastGapBackfiller.updateTimeLogEntries(timeLogEntries)
        this._popupTimer.updateTimeLogEntries(timeLogEntries)
    }

    popupCompleted(popup: PollPopup, responses: PollResponse[]): void {
        // Process the response and trigger events that need to be triggered.
        // The order here is REALLY IMPORTANT. Pay close attention to it, 
        // otherwise weird stuff can happen.
        console.log("PopupService.popupCompleted(): started")
        this._onPopupChanged.emit(null)
        this._popupTimeoutTimer.endTimingPopup()

        let responsesToSubmit : PollResponse[] | null = responses
        
        if (popup.questionType == QuestionType.Detailed) {
            //const latestToTime = maxToTime(responses)
            //this._popupQueue.clearPopupsBefore(latestToTime)
            console.log("PopupService.popupCompleted(): handling detailed response")
            this._latestPopupBackfiller.responseCollected(popup)
            this._popupQueue.clear()
            this._popupQueue.markCurrentPopupDone()
            
        } else {
            console.log("PopupService.popupCompleted(): handling simple response")
            this._popupQueue.markCurrentPopupDone()
            this._latestPopupBackfiller.responseCollected(popup)
            responsesToSubmit = 
                this._pastGapBackfiller.processCollectedResponse(popup, responses)
        }

        if (!responsesToSubmit) {
            // That's it, nothing to do.
            console.log("PopupService.popupCompleted(): nothing to submit")
            console.log("PopupService.popupCompleted(): done")
            return
        }

        // Publish the final response.
        this._onPopupResponseReceived.emit(responsesToSubmit)
        this._apiClient.createPollResponses(responsesToSubmit)
            .catch(err => {/* This is handled elsewhere */})
        console.log("PopupService.popupCompleted(): done")
    }    
    
    showNow(entryText?: string): void {
        this._popupTimer.showNow(entryText)
    }

    switchToDetailedPopup(): void {
        const currentPopup = this._currentPopup

        if (!currentPopup || currentPopup.questionType != QuestionType.Simple) {
            return
        }
        
        this._popupTimeoutTimer.disableTimeout()
        const detailedPopup = new PollPopup(currentPopup)
        detailedPopup.questionType = QuestionType.Detailed
        this._currentPopup = detailedPopup
        this._onPopupChanged.emit(detailedPopup)
    }

    switchToSimplePopup(): void {
        const currentPopup = this._currentPopup

        if (!currentPopup || currentPopup.questionType != QuestionType.Detailed) {
            return
        }

        this._popupTimeoutTimer.enableTimeout()
        const simplePopup = new PollPopup(currentPopup)
        simplePopup.questionType = QuestionType.Simple
        this._currentPopup = simplePopup
        this._onPopupChanged.emit(simplePopup)
    }

    userInteractedWithPopup(): void {
        this._popupTimeoutTimer.resetGracePeriod()
    }

    // pause() : void {

    // }

    // resume() : void {

    // }

    // =============== Private ===================
    private _onPopupChanged = new SimpleEmitter<PollPopup | null>()
    private _onPopupResponseReceived = new SimpleEmitter<PollResponse[]>()

    private _popupQueue : IPopupQueue
    private _popupTimer: IPopupTimer
    private _popupTimeoutTimer: IPopupTimeoutTimer
    private _latestPopupBackfiller: ILatestPopupBackfiller
    private _pastGapBackfiller: IPastGapBackfiller
    private _apiClient: IApiClient

    private _currentPopup: PollPopup | null = null

    private popupDue(popup: PollPopup) {

        this._currentPopup = popup
        this._popupTimeoutTimer.startTimingPopup()

        if (popup.questionType == QuestionType.Detailed) {
            this._popupTimeoutTimer.disableTimeout()
        }

        this._onPopupChanged.emit(popup)
    }

    private popupMissed(): void {
        const currentPopup = this._currentPopup

        if (!currentPopup)
        {
            console.warn("Expected to have a popup in popupMissed(), but didn't find one.")
            return
        }

        // The order here is REALLY IMPORTANT. Pay close attention to it, 
        // otherwise weird stuff can happen.
        this._onPopupChanged.emit(null)
        this._popupTimeoutTimer.endTimingPopup() // Don't need to... but just in case
        this._popupQueue.markCurrentPopupDone()
        this._latestPopupBackfiller.responseMissed(currentPopup)
        this._pastGapBackfiller.responseMissed(currentPopup)
    }
}
