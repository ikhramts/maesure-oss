import { PollPopup } from "shared/model/PollPopup";
import { Poll } from "shared/model/Poll";

export interface IPopupQueue {
    onPopupDue(handler: (popup:PollPopup) => void) : void
    enqueue(popup: PollPopup) : void
    markCurrentPopupDone() : void
    clearPopupsBefore(cutoffTime: Date) : void
    clear() : void
    updatePoll(poll: Poll) : void
}