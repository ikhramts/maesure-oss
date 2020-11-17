import { IServiceWorkerProxy } from "./IServiceWorkerProxy";

let serviceWorker : ServiceWorkerRegistration | null = null
let queuedEventListeners : QueuedEventListener[] = []

// Register the service worker on startup.
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register("service-worker.js")
        .then(worker => {
            serviceWorker = worker

            for (let i = 0; i < queuedEventListeners.length; i++) {
                const queuedEventListener = queuedEventListeners[i]
                navigator.serviceWorker.addEventListener(queuedEventListener.type, queuedEventListener.listener)
            }
        })
        .catch(() => {
            console.log("Worker registration failed")
        })
}

// Main interface.
export class ServiceWorkerProxy implements IServiceWorkerProxy {
    sendNotification(title: string, options: NotificationOptions) {
        if (serviceWorker) {
            serviceWorker.showNotification(title, options)
        }
    }

    getNotifications() : Promise<Notification[]> {
        if (serviceWorker) {
            return serviceWorker!!.getNotifications()
            
        } else {
            return Promise.resolve([])
        }
        
    }

    addEventListener(type: string, listener: (evt:Event) => void) : void {
        if (serviceWorker) {
            serviceWorker.addEventListener(type, listener)
        } else {
            // The service worker may not be initialized yet.
            queuedEventListeners.push({type, listener})
        }
    }

    removeEventListener(type: string, listener: (evt:Event) => void) : void {
        if (serviceWorker) {
            serviceWorker.removeEventListener(type, listener)
        }
    }
}

interface QueuedEventListener {
    type: string
    listener: (evt:Event) => void
}
