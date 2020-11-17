import { PollPopup } from "shared/model/PollPopup";
import { PollResponse } from "shared/model/PollResponse";

export interface IPopupServiceProxy {
    popupCompleted(popup: PollPopup, responses: PollResponse[]) : void
    switchToDetailedPopup() : void
    switchToSimplePopup() : void
    userInteractedWithPopup(): void
}