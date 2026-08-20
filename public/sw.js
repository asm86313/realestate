// 푸시 알림 수신 + 알림 클릭 처리용 서비스워커

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
	let payload = { title: '부동산 관리', body: '새 알림이 있습니다.', url: '/calendar' };

	if (event.data) {
		try {
			payload = { ...payload, ...event.data.json() };
		} catch (e) {
			payload.body = event.data.text();
		}
	}

	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			icon: '/icon-192.png',
			badge: '/icon-192.png',
			data: { url: payload.url || '/calendar' },
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url || '/calendar';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			for (const client of clientList) {
				if (client.url.includes(url) && 'focus' in client) {
					return client.focus();
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(url);
			}
		})
	);
});
