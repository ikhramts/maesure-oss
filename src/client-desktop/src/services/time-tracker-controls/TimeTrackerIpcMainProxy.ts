import { EventEmitter } from "events";
import { Poll } from "shared/model/Poll";
import { User } from "shared/model/User";
import { ipcMain } from "electron";
import { IPC_CHANNEL_POLL_START, IPC_CHANNEL_POLL_STOP, IPC_CHANNEL_POLL_STATE_UPDATE, IPC_CHANNEL_USER_UPDATE } from "./PollIpcChannels";
import { AppWindow } from "client/main/windows/AppWindow";

const POLL_UPDATED_EVENT = 'poll-updated'
const USER_UPDATED_EVENT = 'user-updated'

/**
 * This is the primary channel for communicating with 
 * the TimeTrackerService from the Main Process.
 */
export class TimeTrackerIpcMainProxy {
    constructor(popupWindow: AppWindow) {
        this._popupWindow = popupWindow

        this.handlePollUpdate = this.handlePollUpdate.bind(this)
        this.handleUserUpdate = this.handleUserUpdate.bind(this)

        ipcMain.on(IPC_CHANNEL_POLL_STATE_UPDATE, this.handlePollUpdate)
        ipcMain.on(IPC_CHANNEL_USER_UPDATE, this.handleUserUpdate)
    }

    startPoll() {
        this.emitOnChannel(IPC_CHANNEL_POLL_START)
    }

    stopPoll() {
        this.emitOnChannel(IPC_CHANNEL_POLL_STOP)
    }

    onPollUpdated(handler: (poll: Poll) => void) {
        this._eventEmitter.on(POLL_UPDATED_EVENT, handler)
    }

    onUserUpdated(handler: (user: User) => void) {
        this._eventEmitter.on(USER_UPDATED_EVENT, handler)
    }

    // =================== Private ================
    private _popupWindow : AppWindow
    private _eventEmitter = new EventEmitter()

    private emitOnChannel(channel: string, msg?: any) {
        const renderer = this._popupWindow.getWebContents()

        if (renderer) {
            renderer.send(channel, msg)
        }
    }

    private handlePollUpdate(event: any, args: any) {
        this._eventEmitter.emit(POLL_UPDATED_EVENT, args as Poll)
    }

    private handleUserUpdate(event: any, args: any) {
        this._eventEmitter.emit(USER_UPDATED_EVENT, args as User)
    }
}