import { ITimeService } from "shared/utils/time/ITimeService";
import { Poll } from "shared/model/Poll";
import { PollPopup } from "shared/model/PollPopup";
import { getLatestPopupTimeBefore } from "./PopupSchedule";
import * as moment from 'moment'
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";
import { ILatestPopupBackfiller } from "./ILatestPopupBackfiller";

export const LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME = "LatestPopupBackfiller"

// Helps backfill latest missed popup. Shows messages "What were you doing at <time>?",
// but does it only for the latest popup time. Backfilling missed times farther in the
// past is the job of PastGapBackfiller.
export class LatestPopupBackfiller implements ILatestPopupBackfiller {
    constructor(timeService: ITimeService) {
        this._timeService = timeService
    }

    onPopupDue(handler: (popup: PollPopup) => void) {
        this._onPopupDue.addHandler(handler)
    }

    updatePoll(poll: Poll) {
        this._poll = poll
    }

    responseCollected(popup: PollPopup) {
        if (!popup.isBackfill) {
            this._latestMissedRegularPopup = null
        }
    }

    responseMissed(popup: PollPopup) {
        const poll = this._poll;

        if (!popup.isBackfill) {
            this._latestMissedRegularPopup = popup
        }

        if (popup.isBackfill && popup.originatorName != LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME) {
            // This is a popup from some other backfiller. Ignore it.
            return
        }

        const latestMissedRegularPopup = this._latestMissedRegularPopup

        if (!poll || !poll.wasStarted || latestMissedRegularPopup == null) {
            // Nothing to do.
            this._latestMissedRegularPopup = null
            return
        }

        // Figure out whether we should show a backfill popup.
        const popupTimeCollectedMsec = popup.timeCollected.getTime()
        const latestRegularTimeCollectedMsec = latestMissedRegularPopup.timeCollected.getTime()

        const now = this._timeService.now()
        const latestCollectionTime = getLatestPopupTimeBefore(poll, now)
        const latestCollectionTimeMsec = latestCollectionTime.getTime()
        
        const doBackfill = popupTimeCollectedMsec == latestRegularTimeCollectedMsec // This popup is for the latest regular time missed
                           && popupTimeCollectedMsec >= latestCollectionTimeMsec // Avoid cutting into the next popup's slot
        
        if (doBackfill) {
            const asOfTimeStr = moment(latestMissedRegularPopup.timeCollected).format("h:mm A")
            const question = "What were you doing at " + asOfTimeStr + "?"

            const backfillPopup = new PollPopup({
                timeBlockLengthMin: moment.duration(poll.desiredFrequency).asMinutes(),
                isBackfill: true,
                originatorName: LATEST_POPUP_BACKFILLER_ORIGINATOR_NAME,
                question: question,
                timeCollected: latestMissedRegularPopup.timeCollected,
            })

            this._onPopupDue.emit(backfillPopup)
        }
    }

    // ================ Private =====================
    private _timeService: ITimeService
    private _onPopupDue = new SimpleEmitter<PollPopup>()

    private _poll: Poll | null = null
    private _latestMissedRegularPopup : PollPopup | null = null
}
