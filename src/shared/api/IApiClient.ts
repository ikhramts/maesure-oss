import { ActivityGroupCreateRequest, ActivityGroupMoveRequest } from ".";
import { TimeLog } from "shared/model/TimeLog";
import { TotalsResult } from "shared/model";
import { Poll } from "shared/model/Poll";
import { PollUpdateRequest } from "./PollUpdateRequest";
import { PollResponse } from "shared/model/PollResponse";
import { TimeLogDeletion } from "shared/time-tracking/TimeLogDeletion";
import { CreateTempAccountResult } from "./CreateTempAccountResult";
import { User } from "shared/model/User";
import { SignUpRequest } from "./SignUpRequest";
import { TimeTrackerEnvironment } from "shared/time-tracking/TimeTrackerEnvironment";
import { ConnectionErrorType } from "./ConnectionErrorType";

export interface IApiClient {
    onTimeLogChanged(handler: () => Promise<void>) : void
    onConnectionError(handler: (errorType: ConnectionErrorType) => Promise<void>) : void
    onCreatePollResponseFailed(handler: () => Promise<void>) : void
    onUserChanged(handler: () => Promise<void>) : void
    
    createActivityGroup(request: ActivityGroupCreateRequest) : Promise<void>
    moveActivityGroup(request: ActivityGroupMoveRequest) : Promise<void>
    deleteActivityGroup(id: string): Promise<void>
    fetchTimeLog(fromTime: Date, toTime: Date): Promise<TimeLog>
    downloadDailyLogsUrl(fromTime: Date, toTime: Date): string
    fetchTotals(groupBy: string, fromDate: Date, toDate: Date) : Promise<TotalsResult>
    fetchDefaultPoll(): Promise<Poll>
    updateDefaultPoll(pollUpdateRequest: PollUpdateRequest): Promise<void>
    createPollResponse(response: PollResponse): Promise<void>
    createPollResponses(responses: PollResponse[]): Promise<void>
    updateTimeLog(additions: PollResponse[] | null, deletions: TimeLogDeletion[] | null) : Promise<void>
    deleteTimeLogEntries(deletions: TimeLogDeletion[]): Promise<void>
    createTempAccount() : Promise<CreateTempAccountResult>
    fetchCurrentUser(): Promise<User>
    signUp(signUpRequest: SignUpRequest) : Promise<void>
    setAccountFlags(accountFlags: {[id: string]: boolean}) : Promise<void>
    sendClientCheckin(env: TimeTrackerEnvironment, version: string) : Promise<void>
    fetchPaddlePayLink(): Promise<string>
    fetchPaddleUpdateUrl(): Promise<string>
    cancelSubscription(): Promise<void>

    testConnection() : Promise<void>
}