self.addEventListener('install', () => {
    console.log("Installed successfully")
})

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', e => {
    // If the user clicks on the notification, open the 
    // window.
    var notification = e.notification;
    var location = notification.data.location
    var action = e.action;
    notification.close();

    if (action != 'close') {
        // If the user clicked 'Yes' submit the response.
        if (action == 'yes') {
            e.waitUntil(clients.matchAll({
                includeUncontrolled: true
            }).then((clientList) => {
                if (clientList.length == 0) {
                    return;
                }

                clientList[0].postMessage({event: "USER_CONFIRMED_DOING_THE_SAME_THING"});
                console.log("message sent")
            }));

            return;
        }

        // Otherwise, open the window.
        e.waitUntil(clients.matchAll({
            includeUncontrolled: true
        }).then((clientList) => {

            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                console.log(client.url)
                if (client.url == location && 'focus' in client)
                    return client.focus();
            }
            if (clients.openWindow)
                return clients.openWindow(location);

        }));
        
    }
})