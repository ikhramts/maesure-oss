import * as React from 'react'
import * as moment from 'moment'
import { TimeTrackerProxy } from './TimeTrackerProxy';
import { PollPopup } from 'shared/model/PollPopup';
import { PopupTimer } from './popup-management/PopupTimer';
import { ITimeService } from 'shared/utils/time/ITimeService';
import { ITimerFactory } from 'shared/utils/time/ITimerFactory';
import { Poll } from 'shared/model/Poll';
import { PollManager } from './PollManager';
import { PopupTimeoutTimer as PopupTimeoutTimer } from './popup-management/PopupTimeoutTimer';
import { PopupQueue } from './popup-management/PopupQueue';
import { LatestPopupBackfiller } from './popup-management/LatestPopupBackfiller';
import { ApiClient } from 'shared/api/ApiClient'
import { PollResponse } from 'shared/model/PollResponse';
import { PastGapBackfiller } from './popup-management/PastGapBackfiller';
import { PollUpdateRequest } from 'shared/api/PollUpdateRequest';
import { NotificationsManager } from 'shared/utils/notifications/NotificationsManager';
import { User } from 'shared/model/User';
import { AccountType } from 'shared/model/AccountType';
import { RecentResponseSuggestionService } from './RecentResponseSuggestionService';
import { PopupNotificationManager } from './PopupNotificationManager';
import { ServiceWorkerProxy } from 'shared/utils/service-workers/ServiceWorkerProxy';
import { TimeTrackerEnvironment } from './TimeTrackerEnvironment';
import { TimeLogDeletion } from './TimeLogDeletion';
import { PopupService } from './popup-management/PopupService';
import { TimeLogEntry } from 'shared/model/TimeLogEntry';
import { ConnectionMonitor } from './ConnectionMonitor';
import { ConnectionState } from './ConnectionState';

export const TIME_TRAKCER_SERVICE_ORIGINATOR_NAME = "TimeTrackerService"

export interface TimeTrackerServiceState {
    isReady: boolean
    lastPollResponseChange: Date
    showingPopup: PollPopup | null
    poll?: Poll
    canRequestNotifications: boolean
    user?: User,
    processingFirstResponse: boolean,

    recentEntries: TimeLogEntry[]

    isLoading: boolean
    connectionState: ConnectionState
    nextConnectionCheckTime: Date | null
}

export class PopupQuestion {
    question: string = ""
}

export interface TimeTrackerContext {
    environment: TimeTrackerEnvironment
    timeService: ITimeService
    timerFactory: ITimerFactory
    apiClient: ApiClient
    connectionMonitor: ConnectionMonitor
}

export interface TimeTrackerServiceProps {
    // timeService: ITimeService
    // apiClient: ApiClient
    context: TimeTrackerContext
    renderChildren: (timeTracker: TimeTrackerProxy) => JSX.Element
}

// Require: ApiClient, TimeService
// Replace all references
export class TimeTrackerService extends React.Component<TimeTrackerServiceProps, TimeTrackerServiceState> {
    constructor(props: TimeTrackerServiceProps) {
        super(props)

        // Bindings
        this.onPopupChanged = this.onPopupChanged.bind(this);  
        this.onPopupResponseReceived = this.onPopupResponseReceived.bind(this); 
        this.onNotificationPopupCompleted = 
            this.onNotificationPopupCompleted.bind(this)
        this.requestNotifications = this.requestNotifications.bind(this)
        this.declineNotifications = this.declineNotifications.bind(this)

        this.startPoll = this.startPoll.bind(this);
        this.stopPoll = this.stopPoll.bind(this);
        this.enableWebTracker = this.enableWebTracker.bind(this)
        this.disableWebTracker = this.disableWebTracker.bind(this)
        this.updatePoll = this.updatePoll.bind(this)
        this.submitTimeLogEntry = this.submitTimeLogEntry.bind(this)
        this.deleteTimeLogEntries = this.deleteTimeLogEntries.bind(this)

        this.reloadPoll = this.reloadPoll.bind(this)
        this.setPoll = this.setPoll.bind(this)
        this.reloadUser = this.reloadUser.bind(this)
        this.onTimeLogChanged = this.onTimeLogChanged.bind(this)
        this.reloadTimeLog = this.reloadTimeLog.bind(this)
        this.updateCanRequestNotifications = this.updateCanRequestNotifications.bind(this)
        
        this.canBotherUser = this.canBotherUser.bind(this)

        this.onConnectionFailed = this.onConnectionFailed.bind(this)
        this.onConnectionCheckStarted = this.onConnectionCheckStarted.bind(this)
        this.onConnectionRestored = this.onConnectionRestored.bind(this)

        // Initialize services.
        this._timeService = props.context.timeService
        this._timerFactory = props.context.timerFactory
        this._apiClient = props.context.apiClient
        this._pollManager = new PollManager(this._timeService, this._apiClient)
        this._serviceWorkerProxy = new ServiceWorkerProxy()
        this._notificationsManager = new NotificationsManager()
        this._responseSuggesionService = new RecentResponseSuggestionService()
        
        // Initialize ConnectionMonitor.
        this._connectionMonitor = props.context.connectionMonitor
        this._connectionMonitor.onConnectionFailed(this.onConnectionFailed)
        this._connectionMonitor.onConnectionCheckStarted(this.onConnectionCheckStarted)
        this._connectionMonitor.onConnectionRestored(this.onConnectionRestored)

        // Initialize PopupService.
        const popupQueue = new PopupQueue(this._timerFactory, this._timeService)
        const popupTimer = new PopupTimer(this._timerFactory, this._timeService)
        const popupTimeoutTimer = new PopupTimeoutTimer(this._timerFactory, this._timeService)
        const latestPopupBackfiller = new LatestPopupBackfiller(this._timeService)
        const pastGapBackfiller = new PastGapBackfiller(this._timeService)

        this._popupService = new PopupService(popupQueue,
                                              popupTimer,
                                              popupTimeoutTimer,
                                              latestPopupBackfiller,
                                              pastGapBackfiller,
                                              this._apiClient)

        this._popupService.onPopupChanged(this.onPopupChanged)
        this._popupService.onPopupResponseReceived(this.onPopupResponseReceived)
        
        this._popupNotificationManager = 
            new PopupNotificationManager(this._serviceWorkerProxy, 
                                         this._notificationsManager, 
                                         this.onNotificationPopupCompleted)

        // Wire up other things
        this._apiClient.onTimeLogChanged(this.onTimeLogChanged)
        this._apiClient.onUserChanged(this.reloadUser)

        // Initialize data.
        this.state = {
            isReady: false,
            lastPollResponseChange: new Date(0),
            showingPopup: null,
            canRequestNotifications: false,
            processingFirstResponse: false,
            isLoading: true,
            recentEntries: [],
            connectionState: ConnectionState.Ok,
            nextConnectionCheckTime: null
        }
    }

    componentDidMount() {
        this.reloadPoll()
            .then(this.reloadTimeLog)

        this.reloadUser()

        // Update the state from server periodically
        setInterval(() => {
            if (this.state.poll) {
                this.reloadPoll()
                    .then(this.reloadTimeLog)

                this.reloadUser()
            }
        }, 5 * 60 * 1000)
    }

    render() {
        const poll = this.state.poll
        const isRunning = poll && poll.wasStarted

        var proxy = {
            environment: this.props.context.environment,
            isRunning: isRunning,
            showingPopup: this.state.showingPopup,
            poll: poll,
            lastPollResponseChange: this.state.lastPollResponseChange,
            canRequestNotifications: this.state.canRequestNotifications,
            user: this.state.user ? this.state.user : null,
            recentEntries: this.state.recentEntries,
            processingFirstResponse: this.state.processingFirstResponse,
            isLoading: this.state.isLoading,

            responseSuggestionService: this._responseSuggesionService,
            apiClient: this._apiClient,
            popupService: this._popupService,

            connectionState: this.state.connectionState,
            nextConnectionCheckTime: this.state.nextConnectionCheckTime,

            startPoll: this.startPoll,
            stopPoll: this.stopPoll,
            enableWebTracker: this.enableWebTracker,
            disableWebTracker: this.disableWebTracker,
            updatePoll: this.updatePoll,
            submitTimeLogEntry: this.submitTimeLogEntry,
            deleteTimeLogEntries: this.deleteTimeLogEntries,

            requestNotifications: this.requestNotifications,
            declineNotifications: this.declineNotifications,

            checkConnectionNow: this._connectionMonitor.checkNow
        } as TimeTrackerProxy;

        return this.props.renderChildren(proxy);
    }

    // ================ Private ===================
    private _timeService: ITimeService
    private _timerFactory: ITimerFactory
    private _apiClient: ApiClient
    private _pollManager: PollManager
    private _serviceWorkerProxy: ServiceWorkerProxy
    private _notificationsManager: NotificationsManager
    private _responseSuggesionService: RecentResponseSuggestionService
    private _connectionMonitor: ConnectionMonitor

    private _popupService: PopupService
    private _popupNotificationManager: PopupNotificationManager

    // For checking when we can mark the connection as restored
    private _restoredUser = false
    private _restoredPoll = false
    private _restoredTimeLog = false

    private startPoll() {
        if (this.state.user && this.state.user.accountType == AccountType.NONE) {
            // The user is trying it out for the first time on the
            // landing page.
            this.createAccountAndStart()
            return
        }

        // An existing user is starting it.
        const oldPoll = this.state.poll

        if (!oldPoll) {
            throw "Trying to start null poll"
        }

        this._pollManager.startPoll(oldPoll)
            .then(newPoll => {
                this.setPoll(newPoll)
                this._popupService.showNow()
            })
    }

    private stopPoll() {
        const oldPoll = this.state.poll
        this.setState({showingPopup: null})

        if (!oldPoll) {
            throw "Trying to stop null poll"
        }

        this._pollManager.stopPoll(oldPoll)
            .then(newPoll => {
                this.setPoll(newPoll)
            })
    }

    private enableWebTracker() {
        // Change the state immediately to make it feel snappy for the user.
        const newUser = new User(this.state.user)
        newUser.flags.webTrackerEnabled = true
        this.setState({user: newUser})

        // Update the server.
        this._apiClient.setAccountFlags({webTrackerEnabled: true})
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(this.reloadUser)
    }

    private disableWebTracker() {
        // Change the state immediately to make it feel snappy for the user.
        const newUser = new User(this.state.user)
        newUser.flags.webTrackerEnabled = false
        this.setState({user: newUser})

        // Update the server.
        this._apiClient.setAccountFlags({webTrackerEnabled: false})
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(this.reloadUser)
    }

    private updatePoll(pollChanges: PollUpdateRequest) : Promise<void> {
        return this._apiClient.updateDefaultPoll(pollChanges)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(this.reloadPoll)
    }

    private submitTimeLogEntry(pollRespnse: PollResponse) : Promise<void> {
        return this._apiClient.createPollResponse(pollRespnse)
            .catch((err) => { /* swallow - other parts will show the error */ })
    }

    private deleteTimeLogEntries(deletions: TimeLogDeletion[]) : Promise<void> {
        return this._apiClient.deleteTimeLogEntries(deletions)
            .catch((err) => { /* swallow - other parts will show the error */ })
    }

    private onPopupChanged(popup: PollPopup | null) {
        this.setState({showingPopup: popup})

        if (popup && this.canBotherUser()) {
            this._popupNotificationManager.showPopupNotificationIfNeeded(popup)
        }
    }

    private onPopupResponseReceived(responses: PollResponse[]) {
        this._responseSuggesionService.addNewResponses(responses)
        this._popupNotificationManager.updateLatestResponse(responses)
    }

    private onNotificationPopupCompleted(popup: PollPopup, response: PollResponse) {
        this._popupService.popupCompleted(popup, [response])
    }

    private requestNotifications() {
        this._notificationsManager.requestPermissionIfNotAskedYet()
            .then(() => {
                this.setState({
                    canRequestNotifications: this._notificationsManager.canRequestNotifications()
                })
            })
    }

    private declineNotifications() {
        this._notificationsManager.declineNotifications()
        this.setState({ canRequestNotifications: false })
    }

    private reloadPoll() : Promise<void> {
        return this._apiClient.fetchDefaultPoll()
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(poll => {
                if (poll) {
                    this.setPoll(poll)
                }                
            })
    }

    private setPoll(poll: Poll) {
        this._popupService.updatePoll(poll)
        this._popupNotificationManager.updatePoll(poll)

        this.setState({
            isReady: true,
            poll: poll,
        }, this.updateCanRequestNotifications)
    }

    private reloadUser() : Promise<void> {
        return this._apiClient.fetchCurrentUser()
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(user => {
                if (!user) {
                    return
                }

                this._popupService.updateUser(user)

                this.setState({
                    user: user, 
                    isLoading: false,
                }, this.updateCanRequestNotifications)
            })
    }

    private onTimeLogChanged() : Promise<void> {
        // Start these two processes, but don't wait for them
        // to complete.
        this.setState({
            lastPollResponseChange: this._timeService.now(),
            processingFirstResponse: false
        })
        this.reloadTimeLog()
        return Promise.resolve()
    }

    private reloadTimeLog() : Promise<void> {
        const now = this._timeService.now()
        const fromTime = moment(now).subtract(5, 'day').toDate()

        return this._apiClient.fetchTimeLog(fromTime, now)
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(logs => {
                if (!logs) {
                    return
                }

                const entries = logs.entries
                this._popupService.updateTimeLogEntries(entries)
                this._responseSuggesionService.updateTimeLogEntries(entries)
                this._popupNotificationManager.updateTimeLogEntries(entries)
                this.setState({recentEntries: entries})
            })
    }

    private createAccountAndStart() {
        // Show the first popup immediately while we prep the account in the background.
        // To do that, we'll create a temporary fake poll that will be replaced
        // later by the real one.
        const interimPoll = new Poll({
            desiredFrequency: "00:15:00",
            wasStarted: true,
            startedAt: this._timeService.now()
        })

        this.setPoll(interimPoll)
        this._popupService.showNow("Trying out Maesure")

        this.setState({processingFirstResponse: true})

        // While the user is staring at the poll, create the account.
        this._apiClient.createTempAccount()
            .catch((err) => { /* swallow - other parts will show the error */ })
            .then(result => {
                if (!result) return

                this._popupService.updateUser(result.user)
                this.setState({user: result.user})
                this.setPoll(result.defaultPoll)
            })
    }

    private updateCanRequestNotifications() {
        const canRequestNotifications = 
            this._notificationsManager.canRequestNotifications() 
            && this.canBotherUser();

        this.setState({canRequestNotifications: canRequestNotifications});
    }

    private canBotherUser(user?: User) : boolean {
        if (this.state.connectionState != ConnectionState.Ok) {
            return false
        }
        
        if (!user) {
            user = this.state.user
        }

        if (!user) {
            return false
        }

        const environment = this.props.context.environment

        if (environment == TimeTrackerEnvironment.WEB && user.flags && user.flags.appInstalled && !user.flags.webTrackerEnabled) {
            return false
        }

        const poll = this.state.poll

        if (!poll || !poll.wasStarted) {
            return false
        }

        return true
    }

    private onConnectionFailed(nextCheckTime: Date) : void {
        this._restoredUser = false
        this._restoredPoll = false
        this._restoredTimeLog = false

        this.setState({
            connectionState: ConnectionState.Error,
            nextConnectionCheckTime: nextCheckTime
        })
    }

    private onConnectionCheckStarted() : void {
        this.setState({
            connectionState: ConnectionState.Checking,
            nextConnectionCheckTime: null
        })
    }

    private onConnectionRestored() : void {
        this.reloadUser().then(() => {
            this._restoredUser = true,
            this.markConnectionRestoredWhenReady()
        })

        this.reloadPoll().then(() => {
            this._restoredPoll = true
            this.markConnectionRestoredWhenReady()
        })

        this.reloadTimeLog().then(() => {
            this._restoredTimeLog = true
            this.markConnectionRestoredWhenReady()
        })
    }

    private markConnectionRestoredWhenReady() {
        if (this._restoredUser && this._restoredPoll && this._restoredTimeLog) {
            this.setState({
                connectionState: ConnectionState.Ok,
                nextConnectionCheckTime: null,
                lastPollResponseChange: this._timeService.now()
            })
        }
    }
}

export function withTimeTracker(
        context: TimeTrackerContext,
        renderChildren: (timeTracker: TimeTrackerProxy) => JSX.Element) {
    return <TimeTrackerService 
                context={context}
                renderChildren={renderChildren}/>
}

