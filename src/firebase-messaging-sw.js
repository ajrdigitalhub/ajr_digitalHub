importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

let messagingInitialized = false;

function initFCM(config) {
  if (messagingInitialized) return;
  try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();
    
    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Received background message ', payload);
      const notificationTitle = payload.notification?.title || payload.data?.title || 'AJR Digital HUB';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || payload.data?.icon || '/assets/icons/icon-72x72.png',
        badge: '/assets/icons/icon-72x72.png',
        image: payload.notification?.image || payload.data?.image || payload.notification?.imageUrl || payload.data?.imageUrl,
        data: {
          url: payload.data?.url || payload.notification?.clickAction || '/'
        }
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
    
    messagingInitialized = true;
    console.log('[FCM SW] Firebase Messaging initialized.');
  } catch (err) {
    console.error('[FCM SW] Initialization failed:', err);
  }
}

// Receive config messages from client web app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INITIALIZE_FCM') {
    initFCM(event.data.config);
  }
});

// Click redirect deep link behavior
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
