import { Tray, Menu, shell, app, MenuItemConstructorOptions, MenuItem } from 'electron';
import maesureIcon from './assets/icon.ico'
import maesureWarningIcon from './assets/icon-warning.ico'
import { TimeTrackerIpcMainProxy } from '../services/time-tracker-controls/TimeTrackerIpcMainProxy';
import { Poll } from 'shared/model/Poll';
import log from 'electron-log'
import { AuthenticationService } from 'client/services/auth/AuthenticationService';
import { ConnectionState } from 'shared/time-tracking/ConnectionState';
import { ConnectionStateIpcMainProxy } from 'client/services/connection-state/ConnectionStateIpcMainProxy';
import { User } from 'shared/model/User';
import { AccountType } from 'shared/model/AccountType';

export class SystemTray {
    constructor(timeTrackerProxy: TimeTrackerIpcMainProxy, 
                authService: AuthenticationService,
                connectionMonitorProxy: ConnectionStateIpcMainProxy) {
        this._timeTrackerProxy = timeTrackerProxy
        this._authService = authService
        this._connectionMonitorProxy = connectionMonitorProxy

        // Function bindings
        this.renderMenu = this.renderMenu.bind(this)
        this.handlePollStateUpdated = this.handlePollStateUpdated.bind(this)
        this.handleUserUpdated = this.handleUserUpdated.bind(this)
        this.logoutAndQuit = this.logoutAndQuit.bind(this)
        this.handleConnectionStateChanged = this.handleConnectionStateChanged.bind(this)
        this.checkConnectionStateNow = this.checkConnectionStateNow.bind(this)
        this.renderTooltip = this.renderTooltip.bind(this)
        this.getIcon = this.getIcon.bind(this)
        this.updateTray = this.updateTray.bind(this)

        // The rest of initialization
        try {
            this._systemTrayHandle = new Tray(maesureIcon)
            this.updateTray()

        } catch (err) {
            log.error(err)
            app.quit()
        }

        app.on('quit', () => {
            if (this._systemTrayHandle) {
                this._systemTrayHandle.destroy()
            }
        })

        // Wire up to the external services
        this._timeTrackerProxy.onPollUpdated(this.handlePollStateUpdated)
        this._timeTrackerProxy.onUserUpdated(this.handleUserUpdated)
        this._connectionMonitorProxy.onConnectionStateUpdated(this.handleConnectionStateChanged)
    }

    shutUpAboutDeclaredButValueNeverUsed() {

    }

    // ================ Private ==================
    private _timeTrackerProxy: TimeTrackerIpcMainProxy
    private _authService: AuthenticationService
    private _connectionMonitorProxy: ConnectionStateIpcMainProxy
    private _systemTrayHandle : Tray | null = null
    private _poll: Poll | null = null
    private _user: User | null = null
    private _connectionState = ConnectionState.Ok

    private renderMenu() : Menu {
        // Prep the base menu
        const menuTemplate = [
            // Force the user to be logged in on their browser so 
            // they don't see a landing page if they're not logged in.
            { label: "Open Maesure.com", click: () => shell.openExternal("https://maesure.com/api/auth/login?returnUrl=/") },
            { label: "Fix bad submission", click: () => shell.openExternal("https://maesure.com/api/auth/login?returnUrl=/history") },
            
            { type: 'separator' },
            { label: "Log out and quit", click: () => this.logoutAndQuit() },

            { type: 'separator' },
            { label: "Quit", click: () => app.quit() },
        ] as (MenuItemConstructorOptions | MenuItem)[]

        // Add Start/Stop menu item
        let canShowStartStop = true

        const user = this._user
        if (user && user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
            menuTemplate.unshift({type: 'separator'})
            menuTemplate.unshift({label: "Start subscription", click: () => shell.openExternal("https://maesure.com/api/auth/login?returnUrl=/enter-payment")})
            menuTemplate.unshift({label: "Trial expired", enabled: false})

            canShowStartStop = false
        }

        if (this._connectionState != ConnectionState.Ok) {
            // Notify of connection problems
            // These are in reverse order because each operation prepends the
            // menu item at the front.
            menuTemplate.unshift({type: 'separator'})
            menuTemplate.unshift({label: "Try reconnecting...", click: () => this.checkConnectionStateNow()})
            menuTemplate.unshift({label: "Error connecting", enabled: false})

            canShowStartStop = false
        } 
        
        if (canShowStartStop) {
            if (this._poll && this._poll.wasStarted) {
                menuTemplate.unshift({label: "Stop", click: () => this._timeTrackerProxy.stopPoll()})
            } else if (this._poll && !this._poll.wasStarted) {
                menuTemplate.unshift({label: "Start", click: () => this._timeTrackerProxy.startPoll()})
            }
        }

        const menu = Menu.buildFromTemplate(menuTemplate)
        return menu
    }

    private handlePollStateUpdated(poll: Poll) {
        this._poll = poll
        this.updateTray()
    }

    private handleUserUpdated(user: User) {
        this._user = user
        this.updateTray()
    }

    private logoutAndQuit() {
        this._authService.logout()
            .catch(() => { app.quit() })
            .then(() => { app.quit() })
    }

    private handleConnectionStateChanged(state: ConnectionState) {
        this._connectionState = state
        this.updateTray()
    }

    private checkConnectionStateNow() {
        this._connectionMonitorProxy.checkNow()
    }

    private renderTooltip() : string {
        const poll = this._poll

        if (this._user && this._user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
            return "Maesure trial ended"
        } else if (this._connectionState == ConnectionState.Error) {
            return "Could not connect to maesure.com"
        } else if (this._connectionState == ConnectionState.Checking) {
            return "Trying to reconnect to maesure.com..."
        } else if (!poll) {
            return "Not loaded yet..."
        } else if (poll.wasStarted) {
            return "Maesure is running"
        } else {
            return "Maesure is stopped"
        }
    }

    private getIcon() : string {
        if (this._user && this._user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
            return maesureWarningIcon
        
        } else if (this._connectionState == ConnectionState.Ok) {
            return maesureIcon

        } else {
            return maesureWarningIcon
        }
    }

    private updateTray() {
        const menu = this.renderMenu()
        const tooltip = this.renderTooltip()
        const icon = this.getIcon()

        const systemTrayHandle = this._systemTrayHandle!!
        systemTrayHandle.setContextMenu(menu)
        systemTrayHandle.setToolTip(tooltip)
        systemTrayHandle.setImage(icon)
        systemTrayHandle.setTitle("Maesure")
    }

}