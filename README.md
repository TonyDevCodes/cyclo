# Cyclo — Subscription & Renewal Tracker

Cyclo is a **privacy-first, offline-first** subscription and renewal tracker. Log your
recurring subscriptions (streaming, software, cloud storage, insurance, domains, …) and
Cyclo keeps track of upcoming renewals, total spend and possible savings — **without ever
sending your data to a server**. Everything lives in your browser via IndexedDB.

Built as a real, usable tool and as a React + TypeScript portfolio piece.

## Stack

| Concern        | Choice                                             |
| -------------- | ------------------------------------------------- |
| Build tool     | Vite                                              |
| UI             | React + TypeScript                                |
| State          | React Context + hooks (no Redux/Zustand)          |
| Charts         | Recharts                                          |
| Storage        | IndexedDB via Dexie.js — fully offline, no backend |
| PWA            | Web app manifest + hand-written service worker (offline caching), local renewal notifications |
| i18n           | react-i18next with JSON translation files (EN/DE/FR/ES) |

## Features

- **Subscriptions CRUD** — name, price, currency, billing cycle (weekly / monthly /
  quarterly / yearly / custom interval), category, next renewal date, notes. Active/paused
  state. List sortable by renewal date, price, name or category, with search and a
  category filter.
- **Smart categorization** — a local JSON dataset maps ~200 common services (Netflix,
  Spotify, AWS, Adobe, …) to a suggested category. Suggestions appear as you type the name
  and are always overridable. No external API calls.
- **Dashboard / spending insights** — total monthly & annual spend, breakdown by category
  (donut chart), and a 12-month spend-trend area chart.
- **Duplicate / overlap detector** — surfaces categories with more than one active
  subscription as a gentle "possible savings" hint, with a rough "keep the cheapest"
  estimate. Also flags duplicate names.
- **Renewal notifications** — local browser notifications with a configurable lead time
  (1–14 days). Purely client-side; there is no push server.
- **Dark / light mode** — dark is the default; the choice is persisted and applied before
  first paint (no flash).
- **PWA** — installable, works offline after the first visit.
- **Export / import** — full JSON backup for device migration.

## Design

Dark navy / charcoal base with warm gold / amber / orange / red-amber accents — a calm,
premium "executive fintech" feel. Each category has its own accent colour, used
consistently across the list, dashboard and charts.

## Privacy

No backend, no accounts, no cloud sync, no analytics. Every subscription, note and setting
is stored only in the current browser (IndexedDB). Export a backup to move to another
device.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build
```

## Project structure

```
src/
  components/      views + presentational components (+ charts/)
  context/         AppContext — central app state
  hooks/           theme effect, renewal reminders, install prompt
  lib/             Dexie schema, categorization, billing math, insights,
                   currency, backup, sample data, notifications
  locales/         en/de/fr/es translation JSON
  i18n.ts          react-i18next setup
public/
  sw.js            hand-written offline service worker
  manifest.webmanifest
scripts/
  generate-icons.mjs   regenerates the PWA PNG icons (pure Node)
```

## Out of scope (v1)

Browser extension for email auto-detection, cloud sync / accounts, bank / API integrations.
