import * as moment from 'moment'

import { IApiClient } from "../api/IApiClient";
import { ITimeService } from "shared/utils/time/ITimeService";
import { ITimerFactory } from "shared/utils/time/ITimerFactory";
import { ConnectionErrorType } from "../api/ConnectionErrorType";
import { ITimer } from "shared/utils/time/ITimer";
import { SimpleEmitter } from "shared/utils/events/SimpleEmitter";

export const FIRST_CHECK_AFTER_MSEC = 15 * 1000
export const CHECK_BACKOFF_RATE_INCREASE = 2
export const MAX_CHECK_AFTER_MSEC = 5 * 60 * 1000

export class ConnectionMonitor {
    constructor(apiClient: IApiClient, timeService: ITimeService, 
            timerFactory: ITimerFactory) {

        this._apiClient = apiClient
        this._timeService = timeService
        this._timerFactory = timerFactory

        // Bindings
        this.onApiClientError = this.onApiClientError.bind(this)
        this.checkNow = this.checkNow.bind(this)
        this.handleConnectionCheckError = this.handleConnectionCheckError.bind(this)
        this.handleConnectionCheckSucces = this.handleConnectionCheckSucces.bind(this)

        // Wiring things up
        this._apiClient.onConnectionError(this.onApiClientError)
    }

    onConnectionFailed(handler: (nextCheckTime: Date) => void ) : void {
        this._onConnectionFailed.addHandler(handler)
    }

    onConnectionCheckStarted(handler: () => void) : void {
        this._onConnectionCheckStarted.addHandler(handler)
    }

    onConnectionRestored(handler: () => void) {
        this._onConnectionRestored.addHandler(handler)
    }

    async checkNow() : Promise<void> {
        if (!this._currentTimer) {
            // Nothing to check.
            return Promise.resolve()
        }

        this._currentTimer.stop()
        this._onConnectionCheckStarted.emit()

        // Note: setting _currentTimer = null before _apiClient.testConnection()
        // completes will conflict with onApiClientError()

        try {
            await this._apiClient.testConnection()
            this.handleConnectionCheckSucces()
        } catch {
            this.handleConnectionCheckError()
        }
    }

    // ===================== Private =================
    private _apiClient : IApiClient
    private _timeService : ITimeService
    private _timerFactory : ITimerFactory
    
    private _onConnectionFailed = new SimpleEmitter<Date>()
    private _onConnectionRestored = new SimpleEmitter<void>()
    private _onConnectionCheckStarted = new SimpleEmitter<void>()
    private _currentTimer : ITimer | null = null
    private _lastCheckWaitMsec = 0

    private onApiClientError(errorType: ConnectionErrorType): Promise<void> {
        // Ignore any calls if the timer is already running to avoid
        // being unnecessarily chatty.
        // checkNow() will be responsible for handling the timeouts.
        if (this._currentTimer) {
            return Promise.resolve()
        }

        this.handleConnectionCheckError()
        return Promise.resolve()
    }

    private handleConnectionCheckError() {
        // Schedule the next check
        const lastCheckWaitMsec = this._lastCheckWaitMsec
        let nextCheckWaitMsec = lastCheckWaitMsec * CHECK_BACKOFF_RATE_INCREASE

        if (nextCheckWaitMsec == 0) {
            nextCheckWaitMsec = FIRST_CHECK_AFTER_MSEC

        } else if (nextCheckWaitMsec > MAX_CHECK_AFTER_MSEC) {
            nextCheckWaitMsec = MAX_CHECK_AFTER_MSEC
        }

        const timer = this._timerFactory.getTimer()
        timer.onElapsed = this.checkNow
        timer.setInterval(nextCheckWaitMsec)
        timer.setRepeat(false)
        timer.start()

        this._currentTimer = timer
        this._lastCheckWaitMsec = nextCheckWaitMsec

        // Emit the next connection check time
        const now = this._timeService.now()
        const nextCheckTime = moment(now).add(nextCheckWaitMsec, 'milliseconds').toDate()
        this._onConnectionFailed.emit(nextCheckTime)
    }

    private handleConnectionCheckSucces() { 
        this._lastCheckWaitMsec = 0
        this._currentTimer = null
        this._onConnectionRestored.emit()
    }

}