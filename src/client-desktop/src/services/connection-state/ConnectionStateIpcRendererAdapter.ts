import { ConnectionMonitor } from "client/../../shared/time-tracking/ConnectionMonitor";
import { ipcRenderer } from "electron";
import { IPC_CHANNEL_CONNECTION_STATE_UPDATE, IPC_CHANNEL_CONNECTION_CHECK_NOW } from "./ConnectionStateIpcChannel";
import { ConnectionState } from "shared/time-tracking/ConnectionState";
import { SimpleEmitter } from "client/../../shared/utils/events/SimpleEmitter";

export class ConnectionStateIpcRendererAdapter {
    constructor(connectionMonitor: ConnectionMonitor) {
        this._connectionMonitor = connectionMonitor

        this.handleConnectionFailed = this.handleConnectionFailed.bind(this)
        this.handleConnectionRestored = this.handleConnectionRestored.bind(this)
        this.handleConnectionCheckStarted = this.handleConnectionCheckStarted.bind(this)
        this.handleCheckNow = this.handleCheckNow.bind(this)

        connectionMonitor.onConnectionFailed(this.handleConnectionFailed)
        connectionMonitor.onConnectionCheckStarted(this.handleConnectionCheckStarted)
        connectionMonitor.onConnectionRestored(this.handleConnectionRestored)

        ipcRenderer.on(IPC_CHANNEL_CONNECTION_CHECK_NOW, this.handleCheckNow)
    }

    shutUpAboutDeclaredButValueNeverRead() {
        // This method is here just to pacify the compiler.
    }

    onCheckNow(handler: () =>  void) : void {
        this._onCheckNow.addHandler(handler)
    }

    // ====================== Private =======================
    private _onCheckNow = new SimpleEmitter<void>()
    private _connectionMonitor : ConnectionMonitor

    private handleConnectionFailed(nextCheckTime: Date) {
        ipcRenderer.send(IPC_CHANNEL_CONNECTION_STATE_UPDATE, ConnectionState.Error)
    }

    private handleConnectionRestored() {
        ipcRenderer.send(IPC_CHANNEL_CONNECTION_STATE_UPDATE, ConnectionState.Ok)
    }

    private handleConnectionCheckStarted() {
        ipcRenderer.send(IPC_CHANNEL_CONNECTION_STATE_UPDATE, ConnectionState.Checking)
    }

    private handleCheckNow() {
        this._connectionMonitor.checkNow()
        this._onCheckNow.emit()
    }
}