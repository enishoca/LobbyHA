# LobbyHA

![Status](https://img.shields.io/badge/status-beta-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/frontend-React_19-61DAFB?logo=react&logoColor=black)
![Home Assistant](https://img.shields.io/badge/powered%20by-Home%20Assistant-41BDF5?logo=homeassistant&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

A **guest-facing lobby for your Home Assistant smart home**, designed for TVs, wall tablets, and shared devices where guests should control *some* things — but never see your full Home Assistant UI or credentials.

LobbyHA separates guest views from your private Home Assistant environment. Guests only see what you choose. You keep complete control. Guests can scan a QR code to open their own dashboard view — without revealing your Home Assistant URL, credentials, or admin interface. Optionally, protect guest access with a **PIN code** so only authorized guests can view the dashboard.

---

## Why LobbyHA Exists

Running a smart home for guests, family, or shared spaces should feel effortless. But Home Assistant's standard UI exposes settings, profiles, language controls, and configuration pages that don't belong on a guest-facing display.

LobbyHA solves this by:

- **Moving credentials server-side** — the HA long-lived access token never reaches the browser.
- **Providing a locked-down guest view** — read-only, curated, showing only the entities you select.
- **Optional PIN gate** — require a numeric PIN before guests can access the dashboard.
- **Giving admins a separate management UI** — organize entities into areas, control visibility, reorder with drag & drop.

---

## Features

- **Setup Wizard** — guided first-run configuration (HA URL, token, admin password, optional PIN)
- **Admin Dashboard** — discover entities, organize into areas, reorder, hide/unhide
- **Guest Dashboard** — clean, read-only view for shared devices
- **Guest PIN Access** — optionally require a PIN to view the guest dashboard (multiple PINs supported, 7-day sessions)
- **QR Code Access** — guests scan to open the dashboard instantly
- **Area Management** — group entities into named areas with emoji icons
- **Entity Discovery** — browse all HA entities by domain, search, assign to areas
- **Drag & Drop / Arrow Reordering** — fine-tune entity order within each area
- **Extended Attributes** — admin detail popups show full entity attributes and logbook
- **SQLite Storage** — all configuration stored in a local database (no config files needed)
- **WebSocket Proxy** — real-time entity state updates without exposing HA directly
- **Secure Admin Auth** — PBKDF2 SHA-512 with 100k iterations, timing-safe comparison

---

## Architecture

LobbyHA is a **two-part system**: a Node.js server (proxy + API) and a React dashboard (client).

```
Guest Device   --->  LobbyHA Server  --->  Home Assistant
                     (holds HA token)        (REST + WebSocket)

Admin Browser  --->  LobbyHA Server  --->  Home Assistant
                     (password auth)
```

- **Server** (`packages/server`) — Express + TypeScript + sql.js + WebSocket relay
  - Holds the HA long-lived access token securely
  - Proxies REST and WebSocket calls to Home Assistant
  - Stores all config, entity layout, areas, and admin credentials in SQLite
  - Serves the built dashboard as static files in production

- **Dashboard** (`packages/dashboard`) — React 19 + Vite 6 + HAKit components
  - Guest view: read-only, curated entity display
  - Admin view: entity discovery, area management, settings, QR code generation
  - Home Assistant URL is never exposed to the browser

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Home Assistant** with a [long-lived access token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token)

### 1. Clone and install

```bash
git clone https://github.com/enishoca/LobbyHA.git
cd LobbyHA
npm install
```

### 2. Start in development mode

```bash
npm run dev
```

- Server starts on **port 3000**
- Vite dev server starts on **port 3005** (proxies API to 3000)

### 3. Open the setup wizard

Navigate to `http://localhost:3005/admin`. On first run, you'll be guided through configuration:

- **Home Assistant URL** (e.g., `http://homeassistant.local:8123`)
- **Long-lived access token** from HA
- **Admin password** (default: `admin` — you'll be prompted to change it)

### 4. Curate your dashboard

1. Create **Areas** to organize entities (e.g., Living Room, Kitchen).
2. Use **Discover** to browse available entities.
3. Assign entities to areas using the dropdown selector.
4. Reorder entities with the arrow buttons or drag & drop.
5. Share the **QR code** with guests for instant access.

### 5. (Optional) Set up guest PIN access

You can require guests to enter a PIN before they see the dashboard:

1. Open **Admin Dashboard → Settings** (gear icon).
2. Scroll to **Guest PIN Access**.
3. Toggle **Require PIN for guest access** on.
4. Add one or more PINs (e.g., `1234`, `5678` — each guest or group can have their own).
5. Changes save automatically.

When enabled, guests see a PIN entry screen before the dashboard loads. Sessions last **7 days**, so guests won't need to re-enter the PIN on every visit. You can also configure PINs during the initial setup wizard.

---

## Production Deployment

```bash
# Build the dashboard
npm run build --workspace=packages/dashboard

# Start the server (serves the built dashboard)
npm run start --workspace=packages/server
```

The server runs on port 3000 by default. Expose only the server to your network or place it behind a reverse proxy.

| Path | Purpose | Auth |
|------|---------|------|
| `/` | Guest dashboard | PIN (if enabled) |
| `/admin` | Admin dashboard | Admin password |
| `/setup` | Setup wizard | None (first run only) |

---

## Project Structure

```
LobbyHA/
├── packages/
│   ├── server/         # Express API + WebSocket proxy + SQLite
│   │   ├── src/
│   │   │   ├── routes/ # API endpoints (admin, discovery, UI, settings)
│   │   │   ├── db.ts   # sql.js database layer
│   │   │   └── index.ts
│   │   └── package.json
│   └── dashboard/      # React 19 + Vite 6 + HAKit
│       ├── src/
│       │   ├── admin/  # Admin components (discovery, area manager, settings)
│       │   ├── guest/  # Guest dashboard
│       │   ├── components/ # Shared components (EntityCard, AreaCard, etc.)
│       │   └── shared/ # Utilities, types
│       └── package.json
├── data/               # SQLite database (auto-created)
└── package.json        # Workspace root
```

---

## Design Trade-offs

LobbyHA exists because Home Assistant's OAuth and browser protections can make a kiosk guest display difficult. Offloading sensitive flows to the server simplifies the guest UI, but introduces intentional limitations:

- Guest UI is **read-only**.
- Admin authentication uses a local password (stored securely with PBKDF2).
- Home Assistant URL is never exposed to the browser.
- Running LobbyHA requires the server process (no static HTML export).

These trade-offs keep the guest experience stable and safe on untrusted hardware.

---

## Acknowledgements

LobbyHA is built on top of **[HAKit](https://github.com/shannonhochkins/ha-component-kit)** — the React-based framework by **Shannon Hochkins** that made this dashboard possible. HAKit provides powerful React components and controls for Home Assistant, and LobbyHA extends it with a server architecture optimized for guest and kiosk use.

Special thanks to Shannon Hochkins for creating HAKit and enabling this project.

---

## License

MIT
