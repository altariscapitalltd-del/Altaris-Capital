/* Firebase Cloud Messaging service worker for Altaris Capital */
/* This file lives in /public so it can be registered at /firebase-messaging-sw.js */

/* eslint-disable no-undef */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDDoefpAZWfQ6IOUk1T1p5JjiagSZjBmfM",
  authDomain: "altaris-4eca6.firebaseapp.com",
  projectId: "altaris-4eca6",
  storageBucket: "altaris-4eca6.firebasestorage.app",
  messagingSenderId: "618794101190",
  appId: "1:618794101190:web:5d007312c53b5bfc9d6ac7",
  measurementId: "G-8E6F6BZMNM",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'Altaris Capital';
  const body = notification.body || '';
  const icon = notification.icon || '/icons/icon-192x192.png';
  const url = (notification.click_action || '/') || '/';

  self.registration.showNotification(title, {
    body,
    icon,
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'navigate', url });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    })
  );
});

