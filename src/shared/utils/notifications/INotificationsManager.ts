export interface INotificationsManager {
    requestPermissionIfNotAskedYet() : Promise<void>
    showNotificationIfTabIsNotActive(text: string) : void 
    showRichNotificationIfTabIsNotActive(title: string, options: NotificationOptions) : void
    canRequestNotifications() : boolean
    declineNotifications() : void
    supportsActions() : boolean
}