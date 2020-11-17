import { IApiClient } from "./IApiClient";
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
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";
import { ConnectionErrorType } from "./ConnectionErrorType";

export class MockApiClient implements IApiClient{
    onTimeLogChanged(handler: () => Promise<void>) : void {
        this.timeLogChangedEvent.addHandler(handler)
    }

    onConnectionError(handler: (errorType: ConnectionErrorType) => Promise<void>) : void {
        this.connectionErrorEvent.addHandler(handler)
    }

    onCreatePollResponseFailed(handler: () => Promise<void>) : void {
        this.createPollResponseFailedEvent.addHandler(handler)
    }

    onUserChanged(handler: () => Promise<void>) : void {
        this.userChangedEvent.addHandler(handler)
    }

    createActivityGroup(request: ActivityGroupCreateRequest) : Promise<void> {
        return Promise.resolve()
    }

    moveActivityGroup(request: ActivityGroupMoveRequest) : Promise<void> {
        return Promise.resolve()
    }

    deleteActivityGroup(id: string): Promise<void> {
        return Promise.resolve()
    }
    
    fetchTimeLog(fromTime: Date, toTime: Date): Promise<TimeLog> {
        return Promise.resolve(new TimeLog())
    }
    
    downloadDailyLogsUrl(fromTime: Date, toTime: Date): string {
        return ""
    }
    
    fetchTotals(groupBy: string, fromDate: Date, toDate: Date) : Promise<TotalsResult> {
        return Promise.resolve(new TotalsResult())
    }

    fetchDefaultPoll(): Promise<Poll> {
        return Promise.resolve(new Poll())
    }
    
    updateDefaultPoll(pollUpdateRequest: PollUpdateRequest): Promise<void> {
        return Promise.resolve()
    }
    
    createPollResponse(response: PollResponse): Promise<void> {
        return Promise.resolve()
    }
    
    createPollResponses(responses: PollResponse[]): Promise<void> {
        return Promise.resolve()
    }

    updateTimeLog(additions: PollResponse[] | null, deletions: TimeLogDeletion[] | null) : Promise<void> {
        return Promise.resolve()
    }
    
    deleteTimeLogEntries(deletions: TimeLogDeletion[]): Promise<void> {
        return Promise.resolve()
    }
    
    createTempAccount() : Promise<CreateTempAccountResult> {
        return Promise.resolve(new CreateTempAccountResult())
    }
    
    fetchCurrentUser(): Promise<User> {
        return Promise.resolve(new User())
    }
    
    signUp(signUpRequest: SignUpRequest) : Promise<void> {
        return Promise.resolve()
    }
    
    setAccountFlags(accountFlags: {[id: string]: boolean}) : Promise<void> {
        return Promise.resolve()
    }
    
    sendClientCheckin(env: TimeTrackerEnvironment, version: string) : Promise<void> {
        return Promise.resolve()
    }

    fetchPaddlePayLink(): Promise<string> {
        return Promise.resolve("")
    }

    fetchPaddleUpdateUrl(): Promise<string> {
        return Promise.resolve("")
    }

    cancelSubscription(): Promise<void> {
        return Promise.resolve()
    }

    testConnection() : Promise<void> {
        return Promise.resolve()
    }
    
    timeLogChangedEvent = new SimpleEmitter<void>()
    connectionErrorEvent = new SimpleEmitter<ConnectionErrorType>()
    createPollResponseFailedEvent = new SimpleEmitter<void>()
    userChangedEvent = new SimpleEmitter<void>()
}