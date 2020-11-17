import { ITimerFactory } from "shared/utils/time/ITimerFactory";
import { ITimeService } from "shared/utils/time/ITimeService";
import { PollPopup } from "shared/model/PollPopup";
import { POPUP_TIMEOUT_MSEC } from "./PopupTimeoutTimer";
import { Poll } from "shared/model/Poll";
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";
import { IPopupQueue } from "./IPopupQueue";

export const WAIT_BETWEEN_POPUPS_MSEC = 100

export class PopupQueue implements IPopupQueue {
    constructor(timerFactory: ITimerFactory, 
                timeService: ITimeService) {

        this.enqueue = this.enqueue.bind(this)
        this.markCurrentPopupDone = this.markCurrentPopupDone.bind(this)
        this.showPopup = this.showPopup.bind(this)
        this.finishShowingPopup = this.finishShowingPopup.bind(this)

        this._timerFactory = timerFactory
        this._timeService = timeService
    }

    onPopupDue(handler: (popup:PollPopup) => void) : void {
        this._onPopupDue.addHandler(handler)
    }

    enqueue(popup: PollPopup) : void {
        this.cleanUpExpiredPopups()

        if (this._openPopup) {
            // Need to wait for the currently open popup to be closed.
            popup.timeQueued = this._timeService.now()
            this._popupQueue.push(popup)
        
        } else {
            // There is no popup open.
            // If the last popup was closed right before this one, then we'd have 
            // to wait before showing the new popup.
            const nowEpoch = this._timeService.now().getTime()

            if ((nowEpoch - this._lastPopupEpochTime) < WAIT_BETWEEN_POPUPS_MSEC) {
                this.waitThenShowNextPopup(popup)
            
            } else {
                // Can show right away.
                this._openPopup = popup;
                this.showPopup(popup)
            }
        }
    }

    markCurrentPopupDone() : void {
        // Mark the current popup as done.
        this._openPopup = null
        this._lastPopupEpochTime = this._timeService.now().getTime()

        this.cleanUpExpiredPopups()

        // Check if there's a next popup to show.
        const nextPopup = this._popupQueue.shift()

        if (!nextPopup) {
            return
        }

        this.waitThenShowNextPopup(nextPopup)
    }

    clearPopupsBefore(cutoffTime: Date) : void {
        const newPopupQueue = []
        const cutoffTimeMsec = cutoffTime.getTime()

        for (const popup of this._popupQueue) {
            if (popup.timeCollected.getTime() >= cutoffTimeMsec) {
                newPopupQueue.push(popup)
            }
        }

        this._popupQueue = newPopupQueue
    }

    clear() : void {
        this._popupQueue = []
    }

    updatePoll(poll: Poll) : void {
        const oldPoll = this._poll
        this._poll = poll

        // Clean up any previous enqueued popups.
        if ((!oldPoll || !oldPoll.wasStarted) && poll.wasStarted) {
            this._openPopup = null
            this._popupQueue = []
        }
    }

    // ==================== Private ===================
    private _timerFactory: ITimerFactory
    private _timeService: ITimeService
    private _onPopupDue = new SimpleEmitter<PollPopup>()
    private _lastPopupEpochTime : number = 0

    private _poll: Poll | null = null
    private _popupQueue : PollPopup[] = []
    private _openPopup: PollPopup | null = null

    private showPopup(popup : PollPopup) {
        this._onPopupDue.emit(popup)
    }

    private waitThenShowNextPopup(nextPopup: PollPopup) {
        this._openPopup = nextPopup

        const timer = this._timerFactory.getTimer()
        timer.onElapsed = this.finishShowingPopup
        timer.setInterval(WAIT_BETWEEN_POPUPS_MSEC)
        timer.setRepeat(false)
        timer.start()    
    }

    private finishShowingPopup() {
        if (this._openPopup) {
            this.showPopup(this._openPopup)
        }
    }

    private cleanUpExpiredPopups() {
        if (!this.isPollRunning()) {
            // Clean out all popups in the queue.
            this._popupQueue = []
        }

        const goodPopups : PollPopup[] = []
        const nowEpoch = this._timeService.now().getTime()

        for (const popup of this._popupQueue) {
            const queuedTimeEpoch = popup.timeQueued.getTime()

            if (queuedTimeEpoch + POPUP_TIMEOUT_MSEC > nowEpoch) {
                // Still good.
                goodPopups.push(popup)
            }
            // Else: expired. Stop working on it.
        }

        this._popupQueue = goodPopups
    }

    private isPollRunning(): boolean {
        return !!(this._poll && this._poll.wasStarted)
    }
}