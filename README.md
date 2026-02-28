# MAREWATCH — Fisheries Compliance Intelligence

MAREWATCH is a compliance intelligence platform that monitors RFMO (Regional Fisheries Management Organization) regulations and alerts fishing fleet operators to quota changes, zone closures, reporting requirements, and penalties in real time.

## Features

- **Onboarding Wizard** — 5-step setup: role selection, fleet registration (with WCPFC vessel registry lookup), data source configuration, alert preferences, and launch
- **Dashboard** — Compliance score, alert timeline, quota tracker, and prioritized action queue — all filtered to the user's fleet and region
- **Interactive Map** — Leaflet-based map showing vessel positions, zone statuses (critical/watch/clear), and zone detail panels with alerts and recommended actions
- **Data Feed** — Aggregated feed from PDFs, RSS, email, Twitter, and APIs across 8 RFMOs (IATTC, IOTC, CCAMLR, WCPFC, ICCAT, SPRFMO, NAFO, NPFC), with AI-read summaries and action recommendations
- **Compliance Chat** — Natural language assistant that queries a structured RFMO knowledge base scoped to the user's fleet
- **AI Action Panel** — Recommended actions with confidence scores and an adjustable autonomy slider (manual → full auto)
- **Research Portal** — Separate interface for fisheries data analysis and research requests

## Tech Stack

| Layer | Tools |
|-------|-------|
| Framework | React 18, TypeScript, Vite |
| UI | shadcn/ui (Radix), Tailwind CSS, Lucide icons |
| Maps | Leaflet |
| Charts | Recharts |
| Routing | React Router v6 |
| Data | TanStack React Query |
| Forms | React Hook Form + Zod |

## Getting Started

```sh
git clone https://github.com/ZahabTZ/ocean-watch.git
cd ocean-watch
npm install
npm run dev
```

The dev server runs on `http://localhost:8080`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── components/       # UI components (DashboardView, MapView, ChatPanel, CommPanel, DataFeedPanel, etc.)
├── data/             # Mock data (alerts, vessels, RFMO sources, feed items, map zones)
├── hooks/            # Custom hooks (useOnboarding, useMobile)
├── lib/              # Utilities (onboarding, userProfile, complianceChat, alertUtils, wcpfcRegistry)
├── pages/            # Route pages (Index, Onboarding, Research)
└── components/ui/    # shadcn/ui primitives
```
