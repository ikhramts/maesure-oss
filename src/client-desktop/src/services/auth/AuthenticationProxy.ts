import { LoginState } from "./LoginState";
import { ITimeService } from "shared/utils/time/ITimeService";
import { ipcRenderer } from "electron";
import { IPC_CHANNEL_REQUEST_ACCESS_TOKEN, IPC_CHANNEL_REPLY_ACCESS_TOKEN, IPC_CHANNEL_REQUEST_LOGOUT, IPC_CHANNEL_REQUEST_LOGIN, IPC_CHANNEL_REPLY_LOGOUT, IPC_CHANNEL_REPLY_LOGIN, IPC_CHANNEL_UPDATE_LOGIN_STATE } from "./Constants";
import { IpcCorrelatedMessage } from "./IpcCorrelatedMessage";
import { IpcAccessTokenReply } from "./IpcAccessTokenRequest";
import { IpcLoginStateUpdate } from "./IpcLoginStateUpdate";

const IPC_REQUEST_EXPIRY_MSEC = 5 * 60 * 1000 // 5 min

export class AuthenticationProxy {
    constructor(timeService: ITimeService, onLoginStateChanged?: (loginState: LoginState) => void) {
        this._timeService = timeService
        this.onLoginStateChanged = onLoginStateChanged

        this.handleAccessTokenReply = this.handleAccessTokenReply.bind(this)
        this.handleLoginReply = this.handleLoginReply.bind(this)
        this.handleLogoutReply = this.handleLogoutReply.bind(this)
        this.handleLoginStateUpdate = this.handleLoginStateUpdate.bind(this)

        ipcRenderer.on(IPC_CHANNEL_REPLY_ACCESS_TOKEN, this.handleAccessTokenReply)
        ipcRenderer.on(IPC_CHANNEL_REPLY_LOGIN, this.handleLoginReply)
        ipcRenderer.on(IPC_CHANNEL_REPLY_LOGOUT, this.handleLogoutReply)
        ipcRenderer.on(IPC_CHANNEL_UPDATE_LOGIN_STATE, this.handleLoginStateUpdate)
    }
    
    getAccessToken() : Promise<string> {
        this.deleteOldRequests()

        return new Promise(resolve => {
            const request = this.prepRequest(resolve)
            ipcRenderer.send(IPC_CHANNEL_REQUEST_ACCESS_TOKEN, request)
        })
    }

    login(): Promise<void> {
        this.deleteOldRequests()

        return new Promise(resolve => {
            const request = this.prepRequest(resolve)
            ipcRenderer.send(IPC_CHANNEL_REQUEST_LOGIN, request)
        })
    }

    logout(): Promise<void> {
        this.deleteOldRequests()

        return new Promise(resolve => {
            const request = this.prepRequest(resolve)
            ipcRenderer.send(IPC_CHANNEL_REQUEST_LOGOUT, request)
        })
    }

    // ================== Priate ===================
    private _timeService : ITimeService
    private onLoginStateChanged?: (loginState: LoginState) => void

    private _requestsByCorrelationId: {[id: string] : WaitingIpcRequest} = {}
    private _prevCorrelationId = 0

    private getCorrelationId() : string {
        this._prevCorrelationId++
        return "" + this._prevCorrelationId
    }

    private handleAccessTokenReply(event: any, args: any) {
        const {correlationId, accessToken} = args as IpcAccessTokenReply
        this.resolveRequest(correlationId, accessToken)
    }

    private handleLoginReply(event: any, args: any) {
        const {correlationId} = args as IpcCorrelatedMessage
        this.resolveRequest(correlationId)
    }

    private handleLogoutReply(event: any, args: any) {
        const {correlationId} = args as IpcCorrelatedMessage
        this.resolveRequest(correlationId)
    }

    private handleLoginStateUpdate(event:any, args: any) {
        const {loginState} = args as IpcLoginStateUpdate

        if (this.onLoginStateChanged) {
            this.onLoginStateChanged(loginState)
        }
    }

    private deleteOldRequests() {
        // Clean up all requests older than a certain time.
        const now = this._timeService.now()

        for (let key in this._requestsByCorrelationId) {
            const startedAt = this._requestsByCorrelationId[key].startedAt
            const ipcRequestTimeMsec = startedAt.getTime() - now.getTime()

            if (ipcRequestTimeMsec > IPC_REQUEST_EXPIRY_MSEC) {
                delete this._requestsByCorrelationId[key]
            }
        }
    }

    /***
     * Returns: correlationId
     */
    private prepRequest(resolve: (data?: any) => void) : IpcCorrelatedMessage {
        const now = this._timeService.now()
        const correlationId = this.getCorrelationId()
        const waitingIpcRequest = new WaitingIpcRequest(resolve, correlationId, now)
        this._requestsByCorrelationId[correlationId] = waitingIpcRequest
        return {correlationId : correlationId}
    }

    private resolveRequest(correlationId: string, data?: any) {
        const waitingIpcRequest = this._requestsByCorrelationId[correlationId]
        delete this._requestsByCorrelationId[correlationId]
        
        if (data) {
            waitingIpcRequest.resolve(data)
        } else {
            waitingIpcRequest.resolve()
        }
    }
}

class WaitingIpcRequest {
    resolve: (data?: any) => void
    correlationId: string
    startedAt: Date

    constructor(resolve: (data?: any) => void, correlationId: string, startedAt: Date) {
        this.resolve = resolve
        this.correlationId = correlationId
        this.startedAt = startedAt
    }
}