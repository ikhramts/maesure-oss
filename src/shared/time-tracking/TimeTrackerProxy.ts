import { PollPopup } from "shared/model/PollPopup";
import { PollResponse } from "shared/model/PollResponse";
import { Poll } from "shared/model/Poll";
import { PollUpdateRequest } from "shared/api/PollUpdateRequest";
import { User } from "shared/model/User";
import { IResponseSuggestionService } from "./IResponseSuggestionService";
import { ApiClient } from "shared/api/ApiClient";
import { TimeTrackerEnvironment } from "./TimeTrackerEnvironment";
import { TimeLogDeletion } from "./TimeLogDeletion";
import { PopupService } from "./popup-management/PopupService";
import { TimeLogEntry } from "shared/model/TimeLogEntry";
import { ConnectionState } from "./ConnectionState";

export interface TimeTrackerProxy {
    environment: TimeTrackerEnvironment
    isRunning: boolean
    showingPopup?: PollPopup
    poll: Poll | null
    lastPollResponseChange: Date
    canRequestNotifications: boolean
    user: User | null
    recentEntries: TimeLogEntry[]
    processingFirstResponse: boolean,
    isLoading: boolean,

    responseSuggestionService: IResponseSuggestionService
    apiClient: ApiClient
    popupService: PopupService

    connectionState: ConnectionState
    nextConnectionCheckTime: Date | null

    startPoll: () => void
    stopPoll: () => void
    enableWebTracker: () => void
    disableWebTracker: () => void
    updatePoll: (pollChanges: PollUpdateRequest) => Promise<void>
    submitTimeLogEntry: (pollResponse: PollResponse) => Promise<void>
    deleteTimeLogEntries: (deletions: TimeLogDeletion[]) => Promise<void>
    
    requestNotifications: () => void
    declineNotifications: () => void

    checkConnectionNow: () => void
}