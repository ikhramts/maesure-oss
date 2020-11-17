import { INotificationsManager } from "./INotificationsManager";

export class MockNotificationsManager implements INotificationsManager {
    lastNotificationTitle: string | null = null
    lastNotificationOptions: NotificationOptions | null = null
    shouldSupportActions: boolean = true

    requestPermissionIfNotAskedYet(): Promise<void> {
        throw new Error("Method not implemented.");
    }    
    
    showNotificationIfTabIsNotActive(text: string): void {
        throw new Error("Method not implemented.");
    }
    
    showRichNotificationIfTabIsNotActive(title: string, options: NotificationOptions): void {
        this.lastNotificationTitle = title
        this.lastNotificationOptions = options
    }
    
    canRequestNotifications(): boolean {
        throw new Error("Method not implemented.");
    }
    
    declineNotifications(): void {
        throw new Error("Method not implemented.");
    }

    clearCapturedData() {
        this.lastNotificationTitle = null
        this.lastNotificationOptions = null
    }

    supportsActions() : boolean {
        return this.shouldSupportActions
    }
}