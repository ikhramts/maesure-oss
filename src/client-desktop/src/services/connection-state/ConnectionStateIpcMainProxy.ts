import { AppWindow } from "client/main/windows/AppWindow";
import { ConnectionState } from "shared/time-tracking/ConnectionState";
import { SimpleEmitter } from "client/../../shared/utils/events/SimpleEmitter";
import { IPC_CHANNEL_CONNECTION_CHECK_NOW, IPC_CHANNEL_CONNECTION_STATE_UPDATE } from "./ConnectionStateIpcChannel";
import { ipcMain } from "electron";

export class ConnectionStateIpcMainProxy {
    constructor(popupWindow: AppWindow) {
        this._popupWindow = popupWindow

        this.handleConnectionStateUpdate = this.handleConnectionStateUpdate.bind(this)
        ipcMain.on(IPC_CHANNEL_CONNECTION_STATE_UPDATE, this.handleConnectionStateUpdate)
    }

    checkNow() {
        this.emitOnChannel(IPC_CHANNEL_CONNECTION_CHECK_NOW)
    }

    onConnectionStateUpdated(handler: (state: ConnectionState) => void) {
        this._onConnectionStateUpdated.addHandler(handler)
    }

    // ==================== Private ====================
    private _popupWindow : AppWindow
    private _onConnectionStateUpdated = new SimpleEmitter<ConnectionState>()
    
    private emitOnChannel(channel: string, msg?: any) {
        const renderer = this._popupWindow.getWebContents()

        if (renderer) {
            renderer.send(channel, msg)
        }
    }

    private handleConnectionStateUpdate(event: any, args: any) {
        const state = args as ConnectionState
        this._onConnectionStateUpdated.emit(state)
    }
}