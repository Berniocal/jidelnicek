/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// VLOŽ STEJNÝ firebaseConfig jako v index.html
firebase.initializeApp({
  apiKey: "VLOZ_API_KEY",
  authDomain: "VLOZ_AUTH_DOMAIN",
  projectId: "VLOZ_PROJECT_ID",
  storageBucket: "VLOZ_STORAGE_BUCKET",
  messagingSenderId: "VLOZ_SENDER_ID",
  appId: "VLOZ_APP_ID"
});

const messaging = firebase.messaging();

// data-only message na pozadí
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "Jídelní deník";
  const body = data.body || "Klikni a zapiš.";
  const date = data.date || ""; // YYYY-MM-DD
  const meal = data.meal || ""; // breakfast|lunch|dinner

  self.registration.showNotification(title, {
    body,
    icon: "./icon-192.png",
    data: { date, meal },
    tag: "jidelnicek-reminder",
    renotify: true
  });
});

// klik na notifikaci -> otevřít appku s query ?date=YYYY-MM-DD&meal=...
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const date = event.notification.data?.date || "";
  const meal = event.notification.data?.meal || "";

  let url = "./";
  if(date){
    url = `./?date=${encodeURIComponent(date)}`;
    if(meal) url += `&meal=${encodeURIComponent(meal)}`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
