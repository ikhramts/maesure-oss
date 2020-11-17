export interface IServiceWorkerProxy {
    sendNotification(title: string, options: NotificationOptions) : void
    getNotifications() : Promise<Notification[]>
    addEventListener(type: string, listener: (evt:Event) => void) : void
    removeEventListener(type: string, listener: (evt:Event) => void) : void
}