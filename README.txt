# Jídelní deník (PWA + Firebase + push notifikace)

## Co to umí
- Zápisy: snídaně / oběd / večeře
- Ráno ke snídani: bolest (záda, krk, lopatky 0–3) + poznámka
- Přehledná tabulka + plná editace kliknutím na řádek
- Push notifikace: v čase snídaně/oběda/večeře otevře **jen jedno pole** (rychlý zápis)
- Export týdne/měsíce do PDF

## Soubory
- index.html
- sw.js (offline cache)
- firebase-messaging-sw.js (push notifikace + klik open deep-link)
- manifest.webmanifest
- icon-192.png, icon-512.png

## Firebase nastavení (nutné)
1) Firebase Console:
   - Authentication → zapnout Anonymous
   - Firestore → vytvořit databázi
   - Cloud Messaging → používat pro Web Push
2) Vložit `firebaseConfig` do:
   - index.html (v `<script type="module">`)
   - firebase-messaging-sw.js
3) VAPID key:
   - Project settings → Cloud Messaging → Web Push certificates → Public key
   - vložit do `VAPID_KEY` v index.html
4) Firestore rules:
   - vlož obsah `firestore.rules` do Firestore Rules
5) Hosting:
   - musí být přes HTTPS (Firebase Hosting nebo GitHub Pages)

## Cloud Function (odesílání notifikací podle časů uživatele)
Soubor: functions/index.js (Firebase Functions v2 + Scheduler)

- nasazení: `firebase deploy --only functions`
- funkce běží každou minutu: `sendMealReminders`

## Nastavení připomínek v aplikaci
V aplikaci klikni „Připomínky“ a nastav časy pro:
- snídani
- oběd
- večeři

## Data ve Firestore
- users/{uid}/days/{YYYY-MM-DD}
- users/{uid}/settings/notifications
- users/{uid}/tokens/{tokenId}

Pozn.: každé zařízení má svůj token, takže jeden uživatel může mít více tokenů.
