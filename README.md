# laif — Your Intelligent Life Manager

A premium personal productivity app with an AI assistant that understands your schedule, tasks, memories, and notes.

## Features

- **Calendar** — Month, week, and day views with drag-to-create events
- **Tasks & Reminders** — Priority levels, status tracking, active/done filters
- **Post-its** — Freeform sticky note canvas with drag, resize, and colour picker
- **Memories** — Save books, movies, songs, places, contacts, links, quotes, and more with AI-powered type detection
- **AI Chat** — Streaming assistant that can read and write your calendar data, understands your local timezone, and renders markdown responses
- **Dark & Light theme** — Fully themed with CSS custom properties

## Tech Stack

- **Framework** — Next.js 14 (App Router)
- **Database** — MongoDB with Mongoose
- **Auth** — JWT via `jose`, httpOnly cookies
- **AI** — OpenRouter (streaming NDJSON), stateless agent loop with tool calling
- **Styling** — Tailwind CSS + Framer Motion
- **Mobile** — Android companion app (see [`laif_mob`](https://github.com/thefullstackalchemist/laif_mob))

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (or local instance)
- OpenRouter API key — [openrouter.ai](https://openrouter.ai)

### Setup

```bash
git clone git@github.com:thefullstackalchemist/laif.git
cd laif
npm install
```

Create `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/laif-prod
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
JWT_SECRET=<random-256-bit-hex>
```

Seed your user account:

```bash
npx ts-node scripts/seed.ts
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

## Project Structure

```
src/
├── app/
│   ├── api/          # REST + streaming API routes
│   ├── login/        # Auth page
│   ├── notes/        # Post-it board page
│   ├── memories/     # Memories page
│   └── page.tsx      # Main calendar view
├── components/
│   ├── calendar/     # Month / week / day / agenda views
│   ├── chat/         # Floating AI chat window
│   ├── layout/       # Sidebar
│   ├── memories/     # Memory cards and type config
│   ├── modals/       # Add item modal
│   └── postits/      # Post-it note components
├── lib/
│   ├── models/       # Mongoose models
│   ├── auth.ts       # JWT sign/verify
│   └── mongodb.ts    # DB connection
├── hooks/            # useItems, useNotes
├── contexts/         # ThemeContext
└── types/            # Shared TypeScript types
```

## Security

- All secrets loaded from environment variables — never hardcoded
- `.env` and `.env.local` are gitignored
- Passwords hashed with bcryptjs
- Auth via httpOnly, secure, sameSite cookies
- API routes protected by middleware JWT verification
- AI API key is server-side only, never exposed to the client
