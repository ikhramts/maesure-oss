import { ServiceWorkerProxy } from "../service-workers/ServiceWorkerProxy";

const NOTIFICATIONS_DECLINED_KEY = "NOTIFICATIONS_DECLINED"
const INTERACTION_GRACE_PERIOD_MSEC = 60 * 1000

export class NotificationsManager {
    constructor() {
        if (window) {
            window.addEventListener('mousemove', () => {
                this._lastInteractTimeMsec = new Date().getTime()
            })
        }
    }

    requestPermissionIfNotAskedYet() : Promise<void> {
        if (!this.canRequestNotifications()) {
            return Promise.resolve()
        }

        // Ask the user.
        return Notification.requestPermission()
            .then(permission => {
                if (permission === "denied") {
                    this.declineNotifications()
                    return
                }

                if (permission !== "granted") {
                    return
                }

                // Permission was granted
                this._serviceWorkerProxy.sendNotification("Maesure", {
                    body: "All set!"
                })
            })
    }

    showNotificationIfTabIsNotActive(text: string) : void {
        if (!this.canShowNotification()) {
            return
        }

        this._serviceWorkerProxy.sendNotification("Maesure", {
            body: text,
            data: {
                location: window!!.location.href
            },
            silent: true
        })

        // Close the notification after 15 sec
        setTimeout(() => {
            this._serviceWorkerProxy.getNotifications()
                .then(notifications => {
                    for (const notification of notifications) {
                        notification.close()
                    }
                })
        }, 10 * 1000)
    }

    showRichNotificationIfTabIsNotActive(title: string, options: NotificationOptions) : void {
        if (!this.canShowNotification()) {
            return
        }

        // Add 'location' property so we could open the right tab after the user clicks
        // on the notification.
        if (!options.data) {
            options.data = {}
        }

        options.data.location = window!!.location.href

        this._serviceWorkerProxy.sendNotification(title, options)

        // Close the notification after 15 sec
        setTimeout(() => {
            this._serviceWorkerProxy.getNotifications()
                .then(notifications => {
                    for (const notification of notifications) {
                        notification.close()
                    }
                })
        }, 10 * 1000)
    }

    canRequestNotifications() : boolean {
        if (!("Notification" in window)) {
            return false
        }

        // Check whether the user has already granted or denied the permission.
        if (Notification.permission === "granted" || Notification.permission === "denied") {
            return false
        }

        const declined = localStorage.getItem(NOTIFICATIONS_DECLINED_KEY)

        if (declined === "true") {
            return false
        }

        return true
    }

    declineNotifications() : void {
        localStorage.setItem(NOTIFICATIONS_DECLINED_KEY, "true")
    }

    supportsActions() : boolean {
        if (!("Notification" in window)) {
            return false
        }

        return 'actions' in Notification.prototype
    }

    // =============== Private =================
    private _lastInteractTimeMsec : number = 0
    private _serviceWorkerProxy = new ServiceWorkerProxy()

    private canShowNotification() : boolean {
        // Check if the browser supports notifications.
        if (!("Notification" in window)) {
            return false
        }

        // Check whether the user has already granted or denied the permission.
        if (Notification.permission !== "granted") {
            return false
        }

        // Check whether we can notify the user.
        if (!document.hidden) {
            // This tab is the top one. Check if the user has interacted with it lately.
            const now = new Date().getTime()

            if ((now - this._lastInteractTimeMsec) < INTERACTION_GRACE_PERIOD_MSEC) {
                // User hasn't been away from the tab long enough.
                return false
            }
        }

        return true
    }

}