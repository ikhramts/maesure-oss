import * as moment from 'moment'
import { ITimerFactory } from "shared/utils/time/ITimerFactory";
import { ITimeService } from "shared/utils/time/ITimeService";
import { ITimer } from "shared/utils/time/ITimer";
import { POPUP_CHECK_INTERVAL_MSEC } from './Constants';
import { SimpleEmitter } from 'shared/utils/events/SimpleEmitter';
import { IPopupTimeoutTimer } from './IPopupTimeoutTimer';

export const POPUP_GRACE_PERIOD_MSEC = 10 * 1000
export const POPUP_TIMEOUT_MSEC = 60 * 1000

export class PopupTimeoutTimer implements IPopupTimeoutTimer {
    constructor(timerFactory:ITimerFactory, timeService: ITimeService) {
        this.onTimerElapsed = this.onTimerElapsed.bind(this)
        
        this._timer = timerFactory.getTimer()
        this._timer.onElapsed = this.onTimerElapsed

        this._timeService = timeService
    }

    onPopupTimedOut(handler: () => void) : void {
        this._onPopupTimedOut.addHandler(handler)
    }

    startTimingPopup() : void {
        // Reset
        this._timer.stop()
        this._timeoutDisabled = false
        this._timerElapsed = false

        // Set the expiry when the next popup will most likely be ready
        // or in POPUP_TIMEOUT_MSEC, whichever is sooner
        const now = this._timeService.now()
        const nextPopupTime = moment(now).startOf('minute')
                                     .add(1, 'minute')
                                     .add(POPUP_CHECK_INTERVAL_MSEC, 'milliseconds')
        
        const nextPopupTimeMsec = nextPopupTime.toDate().getTime()
        const msecToNextPopup = nextPopupTimeMsec - now.getTime()
        const waitInterval = Math.min(msecToNextPopup, POPUP_TIMEOUT_MSEC)

        this._timer.setInterval(waitInterval)
        this._timer.start()
    }

    resetGracePeriod() : void {
        this._lastInteractionTimeMsec = this._timeService.now().getTime()
    }

    endTimingPopup() : void {
        this._timer.stop()
    }

    disableTimeout() : void {
        this._timeoutDisabled = true
    }

    enableTimeout() : void {
        this._timeoutDisabled = false
    
        // Check whether the popup has already timed out
        const nowMsec = this._timeService.now().getTime()
        const msecSinceLastInteraction = nowMsec - this._lastInteractionTimeMsec

        if (this._timerElapsed
                && msecSinceLastInteraction > POPUP_GRACE_PERIOD_MSEC) {
            this._onPopupTimedOut.emit()
        }
    }

    // ============== Private ===============
    private _timer: ITimer
    private _timeService: ITimeService
    private _onPopupTimedOut = new SimpleEmitter<void>()

    private _lastInteractionTimeMsec = 0
    private _timeoutDisabled = false
    private _timerElapsed = false

    private onTimerElapsed() {
        this._timer.stop()
        this._timerElapsed = true
        const nowMsec = this._timeService.now().getTime()
        const msecSinceLastInteraction = nowMsec - this._lastInteractionTimeMsec

        if (msecSinceLastInteraction < POPUP_GRACE_PERIOD_MSEC) {
            // Give the user a bit more time.
            this._timer.setInterval(POPUP_GRACE_PERIOD_MSEC - msecSinceLastInteraction)
            this._timer.start()
            return
        }

        // Time's up - hide the popup.
        if (!this._timeoutDisabled) {
            this._onPopupTimedOut.emit()
        }
    }
}