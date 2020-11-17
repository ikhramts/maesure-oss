import { autoUpdater, FeedURLOptions } from 'electron'
import log from 'electron-log'
import * as process from 'process'

const UPDATE_CHECK_FREQ_MSEC = 5 * 60 * 1000
//const INITIAL_UPDATE_CHECK_DELAY_MSEC = 30 * 1000
const PID = process.pid

export class UpdateService {
    constructor() {
        this.checkForUpdates = this.checkForUpdates.bind(this)
        this.installUpdate = this.installUpdate.bind(this)
        this.handleError = this.handleError.bind(this)
    }

    start() {
        const updatesUrl = "https://static.maesure.com/downloads/stable"
        const feedOptions = {
            url: updatesUrl
        } as FeedURLOptions
        
        autoUpdater.setFeedURL(feedOptions)
        autoUpdater.on('update-downloaded', this.installUpdate)
        autoUpdater.on('error', this.handleError)

        setInterval(this.checkForUpdates, UPDATE_CHECK_FREQ_MSEC)
        //setTimeout(this.checkForUpdates, INITIAL_UPDATE_CHECK_DELAY_MSEC)
    }

    // =================== Private ====================
    private _isUpdating = false

    private checkForUpdates() {
        log.info(`[p:${PID}] UpdateService.checkForUpdates(): started`)
        
        if (!this._isUpdating) {
            autoUpdater.checkForUpdates()
        }
    }

    private installUpdate(event: any, releaseNotes: any, releaseName: any) {
        log.info(`[p:${PID}] UpdateService.installUpdate(): started`)
        this._isUpdating = true

        autoUpdater.quitAndInstall()
        // const dialogOpts = {
        //     type: 'info',
        //     buttons: ['Restart', 'Later'],
        //     title: 'Maesure update',
        //     message: process.platform === 'win32' ? releaseNotes : releaseName,
        //     detail: 'A new version of Maesure has been downloaded. Restart to update?'
        // }
        
        // dialog.showMessageBox(dialogOpts)
        //     .then((result) => {
        //         if (result.response === 0) {
        //             autoUpdater.quitAndInstall()
        //         }
        //     })
    }

    private handleError(error: any) {
        log.error(error)
    }
}