import { ITimeService } from "shared/utils/time/ITimeService";
import { PollPopup } from "shared/model/PollPopup";
import { Poll } from "shared/model/Poll";
import * as moment from 'moment'
import { getLatestPopupTimeBefore } from "./PopupSchedule";

const FIRST_POPUP_EMITTER_ORIGINATOR_NAME = "FirstPopupEmitter"

export class FirstPopupEmitter {
    constructor(timeService: ITimeService, emitPopup: (popup: PollPopup) => void) {
        this._timeService = timeService
        this._emitPopup = emitPopup
    }

    updatePoll(poll: Poll) {
        const oldPoll = this._poll
        this._poll = poll

        if (!poll || !poll.wasStarted) {
            return
        }

        if (this.wasPollJustStarted(oldPoll, poll)) {
            // We just loaded the first poll. Emit a popup for it.
            this.emitFirstPopupAfterStart(poll)
        
        } else if (!oldPoll && poll) {
            // We just loaded into this browser session.
            this.emitPopupForExistingPoll(poll)
        }
    }

    setSuggestedResponse(responseText: string | null) {
        this._suggestedResponse = responseText
    }

    // ================ Private ==================
    private _timeService : ITimeService
    private _emitPopup: (popup: PollPopup) => void
    private _suggestedResponse : string | null = null

    private _poll : Poll | null = null

    private emitFirstPopupAfterStart(poll: Poll) {
        // Align the popup time to the start of the minute.
        const timeCollected = moment(poll.startedAt!!).startOf('minute').toDate()
        const question = "What were you doing right before you saw this?"
        const isBackfill = false

        this.prepareAndEmitPopup(question, timeCollected, isBackfill)
    }

    private emitPopupForExistingPoll(poll: Poll) {
        const now = this._timeService.now()
        const timeCollected = getLatestPopupTimeBefore(poll, now)
        
        if (timeCollected.getTime() > now.getTime()) {
            // This can happen shortly after the poll was started elsewhere.
            return
        }

        // Compose the question
        let question = "What were you doing right before you saw this?"

        if (moment(now).startOf('minute').toDate().getTime() != timeCollected.getTime()) {
            const asOfTimeStr = moment(timeCollected).format("h:mm A")
            question = "What were you doing at " + asOfTimeStr + "?"
        
        }

        const isBackfill = false
        this.prepareAndEmitPopup(question, timeCollected, isBackfill)
    }

    private wasPollJustStarted(oldPoll: Poll | null, newPoll: Poll) : boolean {
        if (!newPoll.wasStarted) {
            return false
        }

        // Check if the poll was started more than a minute ago.
        const now = this._timeService.now().getDate()
        const pollStartTime = newPoll.startedAt!!.getDate()
        
        if (((now - pollStartTime) / 1000) < 60) {
            return false
        }

        // Check whether the old poll was started
        if (!oldPoll || !oldPoll.wasStarted) {
            return true
        }

        const oldStartTime = oldPoll.startedAt!!.getDate()
        if (oldStartTime == pollStartTime) {
            return false
        }

        return true
    }

    private prepareAndEmitPopup(question: string, timeCollected: Date, isBackfill: boolean) {
        const poll = this._poll!!

        const durationMin = moment.duration(poll.desiredFrequency).asMinutes()
        const popup = new PollPopup({
            isBackfill: isBackfill,
            originatorName: FIRST_POPUP_EMITTER_ORIGINATOR_NAME,
            question: question,
            timeCollected: timeCollected,
            timeBlockLengthMin: durationMin,
        })

        if (this._suggestedResponse) {
            popup.suggestedResponse = this._suggestedResponse
        }

        if (this._emitPopup) {
            this._emitPopup(popup)
        }
    }
}
