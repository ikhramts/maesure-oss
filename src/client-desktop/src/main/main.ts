import { app } from 'electron';
import * as path from 'path';
import isDev from 'electron-is-dev'
import log from 'electron-log'
import * as process from 'process'

import { AuthenticationService } from '../services/auth/AuthenticationService';
import { ExitFlagService } from './util/ExitFlagService';
import { UpdateService } from './updates/UpdateService'
import { SystemTray } from './SystemTray';
import { ClientCheckinService } from './updates/ClientCheckinService'

import { ApiClient } from 'shared/api/ApiClient';
import { gettingStartedWindow, timeTrackerPopupWindow } from './windows'
import { TimeTrackerIpcMainProxy } from 'client/services/time-tracker-controls/TimeTrackerIpcMainProxy';
import { MainProcessCredentialsProvider } from 'client/services/api/MainProcessCredentialsProvider'
import { TimeTrackerEnvironment } from 'shared/time-tracking/TimeTrackerEnvironment';
import { AutolaunchBridge } from './updates/AutolaunchBridge';
import { ConnectionStateIpcMainProxy } from 'client/services/connection-state/ConnectionStateIpcMainProxy';

const PID = process.pid
log.info(`[p:${PID}] ============ Starting Maesure ================`)

let isSpecialStartup = false

log.info(`[p:${PID}] Process path: ${process.execPath}`)
log.info(`[p:${PID}] Process cwd: ${process.cwd()}`)
log.info(`[p:${PID}] Process argv:`)
if (process.argv.length > 1) {
    for (const arg of process.argv) {
        log.info(`[p:${PID}]     ${arg}`)
    }
}

//============= Handle install/update/other special tasks ================
const isAutolauncherBridge = process.argv.indexOf('--autolauncherBridge') > 0

if(isAutolauncherBridge) {
    isSpecialStartup = true
    // Maesure was started with --autolauncherBridge bridge flag.
    // Instead of starting normally, this process will check whether
    // Squirrel has started Maesure successfully. If not, then 
    // this autolaunche bridge will do it.
    //
    // This is necesasry because sometimes at the end of an
    // upgrade Squirrel fails to start Maesure.
    AutolaunchBridge.startMaesureIfNotRunning()

} else {
    const isSquirrelSpecialStartup = require('electron-squirrel-startup')

    if (isSquirrelSpecialStartup) {
        isSpecialStartup = true
        log.info(`[p:${PID}] Performing a Squirrel task. Will exit early.`)
        // The executable was started just so that squirrel could
        // handle some of its events.
        // We must exit immediately so we don't accidentally start
        // the real app. However, this will not take effect immedately,
        // so we'll need to handle it farther down as well.

        if (process.argv.indexOf('--squirrel-updated') > 0) {
            // First run of the new version after an update.
            // Start the autolaunch bridge.            
            AutolaunchBridge.scheduleAutolaunchBridgeAndQuit()

        } else {
            app.quit();
        }
    }
}

//============= Initialize services ================
log.info(`[p:${PID}] Starting services...`)
const authService = new AuthenticationService()
const exitFlagService = new ExitFlagService(authService)
const timeTrackerIpcMainProxy = new TimeTrackerIpcMainProxy(timeTrackerPopupWindow)

const env = TimeTrackerEnvironment.DESKTOP
const credentialsProvider = new MainProcessCredentialsProvider(authService)
const apiClient = new ApiClient('https://maesure.com', credentialsProvider, env)
//const apiClient = new ApiClient('http://localhost:5000', credentialsProvider, env)

const checkinService = new ClientCheckinService(apiClient, env)

let systemTray : SystemTray | null = null

//============= Startup function - called later ================
async function start() {
    log.info("start(): Starting")
    // Start logging in
    // log.info("start(): Logging out")
    // await authService.logout()
    // app.quit()

    const wasLoggedIn = await authService.hasRefreshToken()
    log.info("start(): User was logged in on the previous run: " + wasLoggedIn)

    log.info("start(): Logging in")
    await authService.login()
    log.info("start(): Done logging in")

    const isLoggedIn = authService.isLoggedIn()

    if (!isLoggedIn) {
        // No point in hanging around.
        log.info("start(): Could not log in. Quitting.")
        app.quit()
    } else {
        log.info("start(): The user was logged in successfully.")
    }

    // Start the main app.
    log.info("start(): Initializing system tray")
    const connectionMonitorProxy = new ConnectionStateIpcMainProxy(timeTrackerPopupWindow)
    systemTray = new SystemTray(timeTrackerIpcMainProxy, authService, connectionMonitorProxy)
    systemTray.shutUpAboutDeclaredButValueNeverUsed()

    log.info("start(): Opening main popup window")
    timeTrackerPopupWindow.open()

    log.info("start(): starting ClientCheckinService")
    checkinService.start()

    // Special actions on the first login
    if (!wasLoggedIn && isLoggedIn) {
        // Open the getting started window
        log.info("start(): Opening getting started window")
        gettingStartedWindow.open()

        // Mark that we've started the app.
        await apiClient.setAccountFlags({
            'appInstalled': true,
            'appInstalledWindows': true
        })
    }
}

//============= Begin startup ================
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
if (!isSpecialStartup) {
    app.on('ready', start);
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin' && exitFlagService.canExit()) {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    // if (mainWindow === null) {
    //     createWindow();
    // }
});

// In the future, start this app on login.
if (!isDev && !isSpecialStartup) {
    if (process.platform == 'win32') {
        log.info("main.ts: Adding Updater.exe to startup")
        const appFolder = path.dirname(process.execPath)
        const updateExe = path.resolve(appFolder, '..', 'Update.exe')
        const exeName = path.basename(process.execPath)

        app.setLoginItemSettings({
            openAtLogin: true,
            path: updateExe,
            args: [
              '--processStart', `"${exeName}"`,
              '--process-start-args', `"--hidden"`
            ]
          })
    }
}

// Start checking for updates.
const updateService = new UpdateService()
if (!isDev && !isSpecialStartup) {
    log.info("main.ts: Begin checking for updates")
    updateService.start()
}

