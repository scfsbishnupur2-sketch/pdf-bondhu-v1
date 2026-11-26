# ONEORA v3.0.0 — Play Store & Production Release Guide

**Brand:** ONEORA — *One App, More Possibilities*  
**Package ID (Preserved for Seamless Upgrade):** `com.nayak.pdfbondhu`  
**Android Version:** `versionCode = 7`, `versionName = "3.0.0"`  
**Developer:** Suman Nayak

---

## 1. What Works Out of the Box
- **Offline-First Super App:** All PDF Studio tools (including virtualized reader & permanent raster-flattened redaction), Image Studio, Universal Word/Excel/PPT/ZIP Reader, Daily Life Planner (2026–2027 Indian Holidays, Reminders, Tasks, Habits), Personal Finance Manager (with PDF/Excel/CSV Export), AES-256 Encrypted Document Vault, and Smart Utilities run locally using bundled libraries in `public/vendor/`.
- **Firebase Cloud Sync (Live):** Firestore database and Google Authentication are provisioned and protected by hardened owner-only `firestore.rules` (already deployed).
- **ONEORA AI Assistant (Server-Side Proxy):** `/api/ai/chat` runs on `server.ts` using server-side `GEMINI_API_KEY` (never exposed in client JS or APK).
- **Public Website & PWA:** Independent marketing site served at `/website`, `/about`, `/pricing`, `/privacy`, and `/terms` with installable PWA manifest & Service Worker (`oneora-shell-v18`).
- **Android Native Upgrades:** `ReminderReceiver` + `ReminderBootReceiver` (AlarmManager + NotificationManager + reboot restore), `POST_NOTIFICATIONS` permission prompt, native Flashlight toggle, System Alarm shortcut, and OTA sync including `oneora-*.js` and `vendor/*`.

---

## 2. External Setup Required Before Broad Public Launch

Because these items depend on your external Google Play Console, AdMob, and domain registrar accounts, complete them before submitting to Google Play:

1. **Google Play App Signing Keystore (Critical):**
   - Replace the demo keystore in `.github/workflows/build-apk.yml` with your permanent private upload keystore stored as encrypted GitHub Actions Secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).
   - Keep `applicationId = "com.nayak.pdfbondhu"` unchanged so existing PDF Bondhu users receive ONEORA v3.0.0 as a seamless upgrade without losing saved data.
2. **Google Play Billing (ONEORA Pro):**
   - ONEORA Pro currently displays honestly as *Coming Soon via Google Play Billing* (`GET /api/entitlements/status` returns `free` by default with no fake checkout).
   - When ready to monetize, create subscription SKUs in Google Play Console, integrate `com.android.billingclient:billing-ktx` in `android/app/build.gradle.kts`, and verify purchase tokens on your backend before updating Firestore user entitlements.
3. **AdMob Production Ad Units:**
   - Replace test ad unit IDs in `public/admob-service.js` with your verified Google AdMob App ID and Ad Unit IDs, and declare Ads in Google Play Console Data Safety.
4. **Firebase Console Review:**
   - Review `firestore.rules` in Firebase Console to verify they match your production access requirements.
   - Add your custom production domain (e.g., `oneora.app`) under **Firebase Console → Authentication → Settings → Authorized Domains**.
5. **Custom Domain & Production Hosting:**
   - Deploy the Node/Express app (`npm run build && npm start`, listening on `PORT`) with `GEMINI_API_KEY` set as a server-side environment variable, then point DNS (`A` / `CNAME`) and enable HTTPS/SSL.
6. **Play Console Data Safety & Permissions:**
   - Declare `CAMERA` (Document/QR Scanner & Flashlight), `POST_NOTIFICATIONS` & `SCHEDULE_EXACT_ALARM` (Daily Planner Reminders), and optional Google Sign-In / Firestore Cloud Sync (with in-app cloud data deletion via *Profile → Delete Cloud Data*).
