importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ASSETS CACHING (from sw.js)
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_NAME = 'ajr-digital-hub-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Check if request is for document/pages or API calls
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Intercept standard static files
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE CLOUD MESSAGING CONFIGURATION & LOGIC
// ─────────────────────────────────────────────────────────────────────────────
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

// Auto-initialize from cached config on startup
if (typeof caches !== 'undefined') {
  caches.open('fcm-config').then((cache) => {
    return cache.match('/fcm-config.json');
  }).then((response) => {
    if (response) {
      return response.json();
    }
  }).then((config) => {
    if (config) {
      console.log('[FCM SW] Auto-initializing FCM with cached config');
      initFCM(config);
    }
  }).catch((err) => {
    console.error('[FCM SW] Failed to restore config from cache on startup:', err);
  });
}

// Receive config messages from client web app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INITIALIZE_FCM') {
    const config = event.data.config;
    if (typeof caches !== 'undefined') {
      // Persist to cache so we can access it on background wake-up
      caches.open('fcm-config').then((cache) => {
        cache.put('/fcm-config.json', new Response(JSON.stringify(config)));
      }).catch(err => console.error('[FCM SW] Failed to cache config:', err));
    }

    initFCM(config);
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

// Robust push event listener
self.addEventListener('push', (event) => {
  console.log('[FCM SW] Push event received.');

  event.waitUntil(
    (async () => {
      let title = 'AJR Digital HUB';
      let body = '';
      let options = {
        icon: '/assets/icons/icon-72x72.png',
        badge: '/assets/icons/icon-72x72.png',
        data: { url: '/' }
      };

      try {
        // Try to load cached config and initialize FCM to be ready for future events/clicks
        if (!messagingInitialized && typeof caches !== 'undefined') {
          try {
            const cache = await caches.open('fcm-config');
            const response = await cache.match('/fcm-config.json');
            if (response) {
              const config = await response.json();
              initFCM(config);
            }
          } catch (err) {
            console.error('[FCM SW] Failed to initialize FCM in push handler:', err);
          }
        }

        // Manually parse event data first to get the title and body
        let payload = {};
        if (event.data) {
          try {
            payload = event.data.json();
          } catch (e) {
            console.warn('[FCM SW] Push payload is not JSON:', e);
            try {
              payload = { body: event.data.text() };
            } catch (textErr) {
              payload = {};
            }
          }
        }

        console.log('[FCM SW] Decrypted push payload:', JSON.stringify(payload));

        if (payload && typeof payload === 'object') {
          const notification = payload.notification || {};
          const data = payload.data || {};

          title = notification.title || data.title || payload.title || 'AJR Digital HUB';
          body = notification.body || data.body || payload.body || '';
          
          options.body = body;
          options.icon = notification.icon || data.icon || payload.icon || '/assets/icons/icon-72x72.png';
          options.image = notification.image || data.image || notification.imageUrl || data.imageUrl || payload.image || payload.imageUrl;
          options.data.url = data.url || notification.clickAction || payload.url || '/';
        }

        // Wait for a short delay (600ms) to allow the Firebase SDK to receive the push
        // and display the notification automatically if it's active.
        await new Promise(resolve => setTimeout(resolve, 600));

        // Check if a notification with the same title and body is already active/displayed.
        let alreadyDisplayed = false;
        try {
          const activeNotifications = await self.registration.getNotifications();
          console.log('[FCM SW] Active notifications check:', activeNotifications.length);

          for (const n of activeNotifications) {
            if (n.title === title && n.body === body) {
              alreadyDisplayed = true;
              break;
            }
          }
        } catch (checkErr) {
          console.error('[FCM SW] Failed to query active notifications:', checkErr);
        }

        if (alreadyDisplayed) {
          console.log('[FCM SW] Notification already displayed by FCM SDK. Exiting to prevent duplicates.');
          return;
        }

      } catch (err) {
        console.error('[FCM SW] Error parsing push data: ', err);
      }

      // We MUST display a notification to satisfy the browser's anti-silent push policy
      try {
        console.log('[FCM SW] Displaying manual notification:', title, options);
        await self.registration.showNotification(title, options);
      } catch (showErr) {
        console.error('[FCM SW] Failed to show notification:', showErr);
      }
    })()
  );
});

