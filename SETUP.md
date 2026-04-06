# laif — Setup Guide

> A personal assistant web app: events, tasks, reminders, notes, AI brief, and real-time notifications.

## Prerequisites

- Node.js 18+
- A MongoDB instance (Atlas free tier works)
- A Firebase project (Realtime Database + service account)
- An OpenRouter account (free tier works for the AI brief)
- A PostHook account (for scheduled notification delivery)

---

## 1. Clone and install

```bash
git clone https://github.com/<your-org>/laifx.git
cd laifx
npm install
```

---

## 2. Environment variables

Create a `.env.local` file in the project root:

```env
# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/laif

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=<any long random string>

# ── OpenRouter (AI brief + chat) ──────────────────────────────────────────────
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free   # or any free model

# ── Firebase ──────────────────────────────────────────────────────────────────
# Paste the full JSON content of your Firebase service account key (single line)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
FIREBASE_DATABASE_URL=https://<project-id>-default-rtdb.firebaseio.com

# ── PostHook (scheduled notifications) ───────────────────────────────────────
POSTHOOK_API=<your posthook api key>

# ── Web Push / VAPID ─────────────────────────────────────────────────────────
VAPID_PUBLIC_KEY=<generated — see step 5>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same value as VAPID_PUBLIC_KEY>
VAPID_PRIVATE_KEY=<generated — see step 5>
VAPID_SUBJECT=mailto:<your@email.com>
```

---

## 3. MongoDB setup

No manual schema creation needed — Mongoose creates collections automatically on first run.

To seed sample data:

```bash
npm run seed
```

---

## 4. Firebase setup

1. Go to [Firebase Console](https://console.firebase.google.com) → create a project (or use existing)
2. Enable **Realtime Database** in the Build menu → create a database (start in test mode)
3. Go to Project Settings → Service Accounts → **Generate new private key** → download the JSON
4. Paste the entire JSON as a single line into `FIREBASE_SERVICE_ACCOUNT` in `.env.local`
5. Set `FIREBASE_DATABASE_URL` to your database URL (shown in the RTDB dashboard)

**Realtime Database rules** (for notifications path):

```json
{
  "rules": {
    "web-notifications": {
      ".read":  true,
      ".write": true
    }
  }
}
```

---

## 5. Generate VAPID keys (Web Push)

Run once and paste the output into `.env.local`:

```bash
npx web-push generate-vapid-keys
```

Set `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the same public key value.

---

## 6. PostHook setup

1. Sign up at [posthook.io](https://posthook.io)
2. Copy your API key into `POSTHOOK_API`
3. The app posts scheduled jobs to PostHook when items are created/updated; PostHook calls back `POST /api/posthook_listener` at the scheduled time

For local development, expose your localhost with a tunnel:

```bash
npx ngrok http 3000
```

Then set your PostHook webhook URL to `https://<ngrok-id>.ngrok.io/api/posthook_listener`.

---

## 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For OS-level browser notifications (Mac/Windows):
- Allow notifications for `localhost` in your browser
- Allow the browser in **System Settings → Notifications** (macOS) or **System Settings → Notifications & actions** (Windows)

---

## 8. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all variables from `.env.local` to your Vercel project under **Settings → Environment Variables**.

Make sure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is added — it must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser bundle.

After deploying, update your PostHook webhook URL to your production domain:
`https://<your-app>.vercel.app/api/posthook_listener`

---

## Project structure

```
src/
├── app/
│   ├── api/              # API routes (auth, items, notifications, AI)
│   ├── calendar/         # Calendar page
│   └── page.tsx          # Dashboard (bento home)
├── components/
│   ├── calendar/         # WeekView, DayView, AgendaView, ItemDetailPanel
│   ├── dashboard/        # ClockWidget, PomodoroWidget, AIBriefWidget, etc.
│   ├── chat/             # FloatingChat (AI assistant)
│   └── NotificationCenter.tsx
├── hooks/
│   └── useWebNotifications.ts
└── lib/
    ├── models/           # Mongoose models
    ├── firebase-admin.ts
    └── mongodb.ts
public/
└── sw.js                 # Service worker (PWA + Web Push)
```
