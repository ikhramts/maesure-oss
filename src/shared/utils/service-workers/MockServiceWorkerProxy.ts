import { IServiceWorkerProxy } from "./IServiceWorkerProxy";

export class MockServiceWorkerProxy implements IServiceWorkerProxy {
    
    public eventListeners: {[index: string] : ((evt: any) => void)[]} = {}

    sendNotification(title: string, options: NotificationOptions): void {
        throw new Error("Method not implemented.");
    }    
    
    getNotifications(): Promise<Notification[]> {
        throw new Error("Method not implemented.");
    }

    addEventListener(type: string, listener: (evt: Event) => void) : void {
        if (!this.eventListeners[type]) {
            this.eventListeners[type] = []
        }

        this.eventListeners[type].push(listener)
    }

    removeEventListener(type: string, listener: (evt: Event) => void) {
        throw "Not implemented"
    }

    emitEvent(type: string, evt: any) : void {
        if (!this.eventListeners[type]) {
            return
        }

        for (const listener of this.eventListeners[type]) {
            listener(evt)
        }
    }

}