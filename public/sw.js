/* ClaimKing.AI Storm Tracking — Web Push service worker */
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
    const title = data.title || 'ClaimKing.AI Storm Alert';
    const options = {
        body: data.body || '',
        icon: '/claimking_logo.png',
        badge: '/claimking_logo.png',
        data: { url: data.url || '/dashboard/storm-tracking' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/dashboard/storm-tracking';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            for (const w of wins) {
                if (w.url.includes(url) && 'focus' in w) return w.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
