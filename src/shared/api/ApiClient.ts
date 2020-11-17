import { fetch } from 'cross-fetch'
import * as moment from 'moment'
import { ICredentialsProvider } from "./ICredentialsProvider";
import { AccountFlagsSetRequest } from './AccountFlagsSetRequest'
import { ActivityGroupCreateRequest, ActivityGroupMoveRequest } from '.';
import { ClientCheckinRequest } from './ClientCheckinRequest'
import { TimeLog } from 'shared/model/TimeLog';
import { TotalsResult } from 'shared/model';
import { Poll } from 'shared/model/Poll';
import { PollUpdateRequest } from './PollUpdateRequest';
import { PollResponse } from 'shared/model/PollResponse';
import { CreateTempAccountResult } from './CreateTempAccountResult';
import { User } from 'shared/model/User';
import { SignUpRequest } from './SignUpRequest';
import { TimeTrackerEnvironment } from 'shared/time-tracking/TimeTrackerEnvironment';
import { TimeLogDeletion } from 'shared/time-tracking/TimeLogDeletion';
import { TimeLogDeletedRange } from './TimeLogDeletedRange';
import { IApiClient } from './IApiClient';
import { ConnectionErrorType } from './ConnectionErrorType';

/**
 * The primary way to get in touch with the server.
 */
export class ApiClient implements IApiClient {
    constructor(rootUrl: string, credentialsProvider: ICredentialsProvider, 
                env: TimeTrackerEnvironment) {
        this._rootUrl = rootUrl
        this._credentialsProvider = credentialsProvider
        this._env = env

        this.prepRequestWithBody = this.prepRequestWithBody.bind(this)
        this.emitTimeLogChanged = this.emitTimeLogChanged.bind(this)
        this.emitConnectionError = this.emitConnectionError.bind(this)
        this.emitCreatePollResponseFailed = this.emitCreatePollResponseFailed.bind(this)
    }

    // ================= Events =============
    onTimeLogChanged(handler: () => Promise<void>) : void {
        this._onTimeLogChanged.push(handler)
    }

    onConnectionError(handler: (errorType: ConnectionErrorType) => Promise<void>) : void {
        this._onConnectionError.push(handler)
    }

    onCreatePollResponseFailed(handler: () => Promise<void>) : void {
        this._onCreatePollResponseFailed.push(handler)
    }

    onUserChanged(handler: () => Promise<void>) : void {
        this._onUserChangedHandler.push(handler)
    }
    
    // ================= Our APIs =============
    async createActivityGroup(request: ActivityGroupCreateRequest) : Promise<void> {
        return await this.sendPut('/api/activity-groups', request)
    }

    async moveActivityGroup(request: ActivityGroupMoveRequest) : Promise<void> {
        return await this.sendPost('/api/activity-groups/move', request)
    }

    async deleteActivityGroup(id: string): Promise<void> {
        return await this.sendDelete('/api/activity-groups/' + id)
    }

    async fetchTimeLog(fromTime: Date, toTime: Date): Promise<TimeLog> {
        const from = formatTimestamp(fromTime)
        const to = formatTimestamp(toTime)
        const url = "/api/time-log?fromTime=" + from + "&toTime=" + to
        const json =  await this.sendGet(url)
        return new TimeLog(json)
    }

    downloadDailyLogsUrl(fromTime: Date, toTime: Date): string {
        const from = formatTimestamp(fromTime)
        const to = formatTimestamp(toTime)
        const partialUrl = "/api/time-log/csv?fromTime=" + from + "&toTime=" + to
        return this.fullUrl(partialUrl)
    }

    async fetchTotals(groupBy: string, fromDate: Date, toDate: Date) : Promise<TotalsResult> {
        const from = formatDate(fromDate)
        const to = formatDate(toDate)
        const url = `/api/totals?groupBy=${groupBy}&from=${from}&to=${to}`;
        const json = await this.sendGet(url)
        return new TotalsResult(json)
    }

    async fetchDefaultPoll(): Promise<Poll> {
        const json = await this.sendGet('/api/poll')
        return new Poll(json)
    }

    async updateDefaultPoll(pollUpdateRequest: PollUpdateRequest): Promise<void> {
        await this.sendPost('/api/poll', pollUpdateRequest)
    }

    async createPollResponse(response: PollResponse): Promise<void> {
        await this.createPollResponses([response])
    }

    async createPollResponses(responses: PollResponse[]): Promise<void> {
        await this.updateTimeLog(responses, null)
    }

    async updateTimeLog(additions: PollResponse[] | null, deletions: TimeLogDeletion[] | null) : Promise<void> {
        const additionsMsg = additions?.map(getPollResponseMessage)
        
        let deletionsMsg = []

        if (deletions) {
            for (const deletion of deletions) {
                deletionsMsg.push(<TimeLogDeletedRange> {
                    fromTime: formatTimestamp(deletion.fromTime),
                    toTime: formatTimestamp(deletion.toTime),
                    timeZone: "Unknown",
                    timeZoneOffset: formatDurationFromMin(-(new Date().getTimezoneOffset()))
                })
            }        
        }

        const msg = {
            additions: additionsMsg,
            deletions: deletionsMsg
        }

        await this.sendPost('/api/time-log/update', msg)
        await this.emitTimeLogChanged()
    }

    async deleteTimeLogEntries(deletions: TimeLogDeletion[]): Promise<void> {
        await this.updateTimeLog(null, deletions)
    }

    async createTempAccount() : Promise<CreateTempAccountResult> {
        const json = await this.sendPostForJson('/api/try-it-out/create-temp-account')
        return new CreateTempAccountResult(json)
    }

    async fetchCurrentUser(): Promise<User> {
        const json = await this.sendGet('/api/current-user')
        return new User(json)
    }

    async signUp(signUpRequest: SignUpRequest) : Promise<void> {
        return await this.sendPost('/api/signup', signUpRequest)
    }

    async setAccountFlags(accountFlags: {[id: string]: boolean}) : Promise<void> {
        const request = new AccountFlagsSetRequest({
            flags: accountFlags
        })

        return await this.sendPost('/api/account-flags', request)
    }

    async sendClientCheckin(env: TimeTrackerEnvironment, version: string) : Promise<void> {
        const request = new ClientCheckinRequest({
            clientType: env,
            clientVersion: version
        })

        return await this.sendPost('/api/client-checkin', request)
    }

    async fetchPaddlePayLink(): Promise<string> {
        const json = await this.sendGet('/api/subscription/paddle-pay-link?subscriptionPlanId=268de0cc-2f6e-4b84-93db-93f82acec9e1')
        return json.link
    }

    async fetchPaddleUpdateUrl(): Promise<string> {
        const json = await this.sendGet('/api/subscription/paddle-update-url')
        return json.link
    }

    async cancelSubscription(): Promise<void> {
        await this.sendPost('/api/subscription/cancel')
        await this.emitUserChanged()
    }

    // ================= Utilities =============
    /**
     * This function returns if and only if the connection succeeds.
     * If it doesn't the function will throw and trigger connectionError
     * event.
     */
    async testConnection() : Promise<void> {
        await this.fetchCurrentUser()
    }

    // ================= Basic components =============
    async sendGet(url: string) : Promise<any> {
        const request = await this._credentialsProvider.addCredentials({})
        const reply = await this.makeRequest(url, 'GET', request)
        return await reply.json()
    }

    async sendPost(url: string, body?: any) : Promise<void> {
        const request = await this.prepRequestWithBody(body)
        await this.makeRequest(url, 'POST', request)
    }

    async sendPostForJson(url: string, body?: any) : Promise<any> {
        const request = await this.prepRequestWithBody(body)
        const reply = await this.makeRequest(url, 'POST', request)
        return await reply.json()
    }

    async sendPut(url: string, body: any) : Promise<void> {
        const request = await this.prepRequestWithBody(body)
        await this.makeRequest(url, 'PUT', request)
    }

    async sendDelete(url: string) : Promise<void> {
        const request = await this._credentialsProvider.addCredentials({})
        await this.makeRequest(url, 'DELETE', request)
    }

    // ================= General helpers ===========
    fullUrl(url: string) : string {
        const targetUrl = this._rootUrl + url

        if (targetUrl.indexOf('?') >= 0) {
            return targetUrl + "&env=" + this._env
        } else {
            return targetUrl + "?env=" + this._env
        }
    }

    // ================= Private ====================
    private _rootUrl : string
    private _credentialsProvider: ICredentialsProvider
    private _env: TimeTrackerEnvironment
    private _onTimeLogChanged: (() => Promise<void>)[] = []
    private _onConnectionError: ((errorType: ConnectionErrorType) => Promise<void>)[] = []
    private _onCreatePollResponseFailed: (() => Promise<void>)[] = []
    private _onUserChangedHandler: (() => Promise<void>)[] = []

    private async prepRequestWithBody(body?: any) : Promise<RequestInit> {
        let options = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
    
        } as RequestInit
    
        if (body) {
            options.body = JSON.stringify(body)
        }

        options = await this._credentialsProvider.addCredentials(options)
        return options
    }

    private async makeRequest(url: string, method: string, request: RequestInit)
    : Promise<Response> {
        request.method = method

        let reply : Response

        try {
            reply = await fetch(this.fullUrl(url), request)
        } catch (err) {
            this.emitConnectionError(ConnectionErrorType.Connection)
            throw err
        }

        if (!reply.ok) {
            if (reply.status >= 500 && reply.status < 600) {
                this.emitConnectionError(ConnectionErrorType.Server)
            }

            if (reply.body) {
                const text = await reply.text()
                throw text
            } else {
                throw `Response: ${reply.status}` 
            }
        }

        return reply
    }

    private async emitTimeLogChanged() : Promise<void> {
        for (const handler of this._onTimeLogChanged) {
            await handler()
        }
    }

    private async emitConnectionError(errorType: ConnectionErrorType) : Promise<void> {
        for (const handler of this._onConnectionError) {
            await handler(errorType)
        }
    }

    private async emitCreatePollResponseFailed() : Promise<void> {
        for (const handler of this._onCreatePollResponseFailed) {
            await handler()
        }
    }

    private async emitUserChanged() : Promise<void> {
        for (const handler of this._onUserChangedHandler) {
            await handler()
        }
    }

}

interface PollResponseMessage {
    // We want this number to be stored in the user's local time zone, 
    // and not have JSON.stringify() convert it to UTC. 
    timeCollected: string 
    
    responseText: string
    timeBlockLength: string
    timeZoneOffset: string
    timeZone: string
    submissionType: string | null
}

function getPollResponseMessage(response: PollResponse) : PollResponseMessage {
    return {
        timeCollected: formatTimestamp(response.timeCollected),
        responseText: response.responseText,
        timeBlockLength: formatDurationFromMin(response.timeBlockLengthMin),
        timeZone: "Unknown",
        timeZoneOffset: formatDurationFromMin(-(new Date().getTimezoneOffset())),
        submissionType: response.submissionType
    }
}

function formatDurationFromMin(durationMin: number) {
    const sign = durationMin < 0 ? "-" : ""
    const absDurationMin = Math.abs(durationMin)
    const hours = Math.floor(absDurationMin / 60)
    const minutes = absDurationMin - hours * 60
    const minutesSTring = minutes < 10 ? "0" + minutes : minutes
    return sign + hours + ":" + minutesSTring + ":00"
}

function formatTimestamp(date: Date) : string {
    return moment(date).format("YYYY-MM-DD HH:mm:ss")
}

function formatDate(date: Date) : string {
    return moment(date).format("YYYY-MM-DD")
}