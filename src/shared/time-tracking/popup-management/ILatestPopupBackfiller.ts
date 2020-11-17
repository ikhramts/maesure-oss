import { PollPopup } from "shared/model/PollPopup";
import { Poll } from "shared/model/Poll";

export interface ILatestPopupBackfiller {
    onPopupDue(handler: (popup: PollPopup) => void): void
    updatePoll(poll: Poll): void
    responseCollected(popup: PollPopup): void
    responseMissed(popup: PollPopup): void
}