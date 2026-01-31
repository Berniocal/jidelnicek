const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();

function ymdInPrague(date){
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(date);
  const Y = parts.find(p=>p.type==="year").value;
  const M = parts.find(p=>p.type==="month").value;
  const D = parts.find(p=>p.type==="day").value;
  return `${Y}-${M}-${D}`;
}

function nowMinutePrague(date){
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague",
    hour:"2-digit", minute:"2-digit", hour12:false
  }).formatToParts(date);
  const hh = Number(parts.find(p=>p.type==="hour").value);
  const mm = Number(parts.find(p=>p.type==="minute").value);
  return hh*60+mm;
}

exports.sendMealReminders = onSchedule("every 1 minutes", async () => {
  const db = admin.firestore();
  const now = new Date();
  const nowMin = nowMinutePrague(now);
  const today = ymdInPrague(now);

  const usersSnap = await db.collection("users").get();
  if (usersSnap.empty) return;

  const tasks = [];

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    const settingsSnap = await db.doc(`users/${uid}/settings/notifications`).get();
    if (!settingsSnap.exists) continue;

    const s = settingsSnap.data();
    if (!s.enabled) continue;

    const schedule = Array.isArray(s.schedule) ? s.schedule : [];
    const hit = schedule.find(x =>
      Number(x.minute) === nowMin &&
      (x.meal === "breakfast" || x.meal === "lunch" || x.meal === "dinner")
    );
    if (!hit) continue;

    const meal = hit.meal;

    let body = "Klikni a zapiš.";
    if (meal === "breakfast") body = "Klikni a zapiš snídani + stav (ráno).";
    if (meal === "lunch") body = "Klikni a zapiš oběd.";
    if (meal === "dinner") body = "Klikni a zapiš večeři.";

    const tokensSnap = await db.collection(`users/${uid}/tokens`).get();
    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    if (!tokens.length) continue;

    const msg = {
      tokens,
      data: {
        title: "Jídelní deník",
        body,
        date: today,
        meal
      }
    };

    tasks.push(
      admin.messaging().sendEachForMulticast(msg).then(async (res) => {
        // vyčisti neplatné tokeny
        const deletes = [];
        res.responses.forEach((r, i) => {
          if (!r.success) {
            const code = r.error?.code || "";
            if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
              const bad = tokens[i];
              const tokenId = bad.slice(0, 20);
              deletes.push(db.doc(`users/${uid}/tokens/${tokenId}`).delete().catch(()=>{}));
            }
          }
        });
        await Promise.all(deletes);
      }).catch(()=>{})
    );
  }

  await Promise.all(tasks);
});
