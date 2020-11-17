import { PollPopup } from "shared/model/PollPopup";
import { Poll } from "shared/model/Poll";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import { User } from "shared/model/User";

export interface IPopupTimer {
    onPopupDue(handler: (popup:PollPopup) => void) : void
    updatePoll(poll: Poll) : void
    updateUser(user: User) : void
    updateTimeLogEntries(timeLogEntries: TimeLogEntry[]) : void
    showNow(suggestedResponse?: string) : void
    pause() : void
    resume() : void
}