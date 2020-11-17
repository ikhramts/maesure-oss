import { PollPopup } from "shared/model/PollPopup";
import { Poll } from "shared/model/Poll";
import { PollResponse } from "shared/model/PollResponse";
import { TimeLogEntry } from "shared/model/TimeLogEntry";

export interface IPastGapBackfiller {
    onPopupDue(handler: (popup: PollPopup) => void) : void
    updatePoll(poll: Poll): void
    processCollectedResponse(popup: PollPopup, responses: PollResponse[]) 
        : PollResponse[] | null
    responseMissed(popup: PollPopup): void
    updateTimeLogEntries(pollResponses: TimeLogEntry[]) : void
}