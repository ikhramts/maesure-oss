import { Poll } from "shared/model/Poll";
import { PollPopup } from "shared/model/PollPopup";
import { ITimer } from "shared/utils/time/ITimer";
import { ITimerFactory } from "shared/utils/time/ITimerFactory";
import { ITimeService } from "shared/utils/time/ITimeService";

import * as moment from 'moment'
import { getLatestPopupTimeBefore } from "./PopupSchedule";
import { POPUP_CHECK_INTERVAL_MSEC } from "./Constants";
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";
import { IPopupTimer } from "./IPopupTimer";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import { QuestionType } from "shared/model/QuestionType";
import { minuteOfDay } from "shared/utils/time/timeUtils";
import { User } from "shared/model/User";
import { AccountType } from "shared/model/AccountType";

export const POPUP_TIMER_ORIGINATOR_NAME = "PopupTimer"
export const SHOW_DETAILED_POPUP_AFTER_INACTIVITY_MSEC = 40 * 60 * 1000

export class PopupTimer implements IPopupTimer {

    public constructor(timerFactory: ITimerFactory, timeService: ITimeService) {
        this.onTimerElapsed = this.onTimerElapsed.bind(this)
        
        this._timer = timerFactory.getTimer()
        this._timeService = timeService

        this._lastCheckTime =   
            new Date(timeService.now().getTime() - POPUP_CHECK_INTERVAL_MSEC)

        // Set up the timer. We will periodically check whether we should show a popup.
        this._timer.onElapsed = this.onTimerElapsed
        this._timer.setInterval(15 * 1000)
        this._timer.start()
    }

    onPopupDue(handler: (popup:PollPopup) => void) : void {
        this._popupDueEvent.addHandler(handler)
    }

    updatePoll(poll: Poll) : void {
        this._poll = poll
    }

    updateUser(user: User) : void {
        this._user = user
    }

    updateTimeLogEntries(timeLogEntries: TimeLogEntry[]) : void {
        for (const entry of timeLogEntries) {
            const toTime = entry.getToTime().getTime()

            if (!this._lastEntryToTime || toTime > this._lastEntryToTime) {
                this._lastEntryToTime = toTime
            }
        }
    }

    showNow(suggestedResponse?: string) : void {
        // Don't do anything if poll should not be running.
        const poll = this._poll;

        if (!poll || !poll.wasStarted || !poll.startedAt) {
            return;
        }

        // If we're close to the poll's start time, then
        // almost certainly the entry's fromTime needs to
        // align with the poll's startedAt time.
        const pollStartedAtMsec = poll.startedAt.getTime()
        const now = this._timeService.now()

        let popupFromTime : Date

        if (now.getTime() - pollStartedAtMsec < 90 * 1000) {
            popupFromTime = poll.startedAt;
        } else {
            popupFromTime = moment(now).startOf('minute').toDate();    
        }

        this.emitPopup(popupFromTime, QuestionType.Simple, suggestedResponse)
    }

    pause() {
        this._paused = true
    }

    resume() {
        this._paused = false
    }

    // =============== Private ================
    private _timer: ITimer
    private _timeService: ITimeService
    private _popupDueEvent = new SimpleEmitter<PollPopup>()
    private _poll?: Poll
    private _user: User | null = null
    private _lastEntryToTime: number | null = null

    private _lastCheckTime : Date
    private _paused = false

    private onTimerElapsed() {
        const now = this._timeService.now()
        const nowMsec = now.getTime()

        const lastCheckTime = this._lastCheckTime
        this._lastCheckTime = now

        const poll = this._poll
        const user = this._user

        if (!poll || !poll.wasStarted) {
            // There is no active poll
            return
        }

        // Do not show anything if the last popup is in the future
        if (this._lastEntryToTime && this._lastEntryToTime > nowMsec) {
            return
        }

        if (!user 
            || user.accountType == AccountType.NONE 
            || user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
            
            console.log(`PopupTimer.onTimerElapsed(): user.accountType == ${user?.accountType}`)
            return
        }

        if (this._paused) {
            return
        }

        // Figure out if we're supposed to show a popup.
        const lastDueTime = getLatestPopupTimeBefore(poll, now)

        // Should not show a popup for desiredFrequency after its startedAt time.
        // updatePopup() should have taken care of that already.
        const startedAtMin = minuteOfDay(poll.startedAt!!)
        const doNotShowBeforeMin = startedAtMin + poll.getDesiredFrequencyMin()
        const doNotShowBeforeTime = 
            moment(poll.startedAt!!)
            .startOf('day')
            .add(doNotShowBeforeMin, 'minutes')
            .toDate()

        if (nowMsec < doNotShowBeforeTime.getTime()) {
            return
        }
        
        // Should show the popup if we were supposed to show it 
        // between the previous check time and right now.
        // A latestDueTime in the future indicates that we shouldn't show anything yet.
        if(lastDueTime.getTime() > lastCheckTime.getTime() 
                && lastDueTime.getTime() <= now.getTime()) {

            // Figure out what kind of popup we're supposed to show.
            let questionType = QuestionType.Simple
            
            if (!this._lastEntryToTime) {
                if (nowMsec - poll.startedAt!!.getTime() >= SHOW_DETAILED_POPUP_AFTER_INACTIVITY_MSEC) {
                    questionType = QuestionType.Detailed
                }

            } else if ( nowMsec - this._lastEntryToTime >= SHOW_DETAILED_POPUP_AFTER_INACTIVITY_MSEC) {
                questionType = QuestionType.Detailed
            }

            this.emitPopup(lastDueTime, questionType)
        }
    }

    private emitPopup(timeCollected: Date, 
            questionType: QuestionType, suggestedResponse?: string) {

        const durationMin = moment.duration(this._poll!!.desiredFrequency).asMinutes()
        const popup = new PollPopup({
            isBackfill: false,
            originatorName: POPUP_TIMER_ORIGINATOR_NAME,
            question: "What were you doing right before you saw this?",
            timeCollected: timeCollected,
            timeBlockLengthMin: durationMin,
            suggestedResponse: suggestedResponse,
            questionType: questionType
        })

        this._popupDueEvent.emit(popup)
    }
}

