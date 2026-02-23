# LobbyHA

![Status](https://img.shields.io/badge/status-beta-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/frontend-React_19-61DAFB?logo=react&logoColor=black)
![Home Assistant](https://img.shields.io/badge/powered%20by-Home%20Assistant-41BDF5?logo=homeassistant&logoColor=white)
![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)
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
- **Guest PIN Access** — optionally require a PIN to view the guest dashboard (multiple PINs, permanent or 7-day sessions)
- **QR Code Access** — guests scan to open the dashboard instantly
- **Area Management** — group entities into named areas with emoji icons
- **Entity Discovery** — browse all HA entities by domain, search, assign to areas
- **Drag & Drop / Arrow Reordering** — fine-tune entity order within each area
- **Extended Attributes** — admin detail popups show full entity attributes and logbook
- **SQLite Storage** — all configuration stored in a local database (no config files needed)
- **WebSocket Proxy** — real-time entity state updates without exposing HA directly
- **Secure Admin Auth** — PBKDF2 SHA-512 with 100k iterations, timing-safe comparison
- **CLI Port Configuration** — set port via `--port` flag, env var, or admin UI
- **Docker Support** — multi-arch image published to GitHub Container Registry
- **Service Install** — systemd (Linux) and launchd (macOS) service definitions included

---

## Architecture

```
Guest Device   --->  LobbyHA Server  --->  Home Assistant
                     (holds HA token)        (REST + WebSocket)

Admin Browser  --->  LobbyHA Server  --->  Home Assistant
                     (password auth)
```

- **Server** (`packages/server`) — Express + TypeScript + sql.js + WebSocket relay
- **Dashboard** (`packages/dashboard`) — React 19 + Vite 6 + HAKit components

---

## Installation

### Prerequisites

- **Node.js 18+** (for source install)
- **Home Assistant** with a [long-lived access token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token)

Choose your preferred installation method below.

---

### Option 1: From Source (Development)

```bash
git clone https://github.com/enishoca/LobbyHA.git
cd LobbyHA
npm install --legacy-peer-deps
npm run build
npm start
```

Open `http://localhost:3000/setup` on first run to configure.

**Custom port:**

```bash
npm start -- --port 8080
```

**Development mode** (hot reload):

```bash
npm run dev
```

- Server: port 3000
- Vite dev server: port 3005 (proxies API to 3000)

---

### Option 2: Docker

#### Quick Start

```bash
docker run -d \
  --name lobbyha \
  -p 3000:3000 \
  -v lobbyha-data:/data \
  ghcr.io/enishoca/lobbyha:latest
```

Open `http://localhost:3000/setup` to configure.

#### Docker Compose

Create a `docker-compose.yml` (or use the one included in the repo):

```yaml
services:
  lobbyha:
    image: ghcr.io/enishoca/lobbyha:latest
    container_name: lobbyha
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - lobbyha-data:/data
    environment:
      - NODE_ENV=production
      # Optional: pre-configure via env vars
      # - HA_URL=http://homeassistant.local:8123
      # - HA_TOKEN=your_long_lived_access_token
      # - PORT=3000
      # - LOG_LEVEL=INFO

volumes:
  lobbyha-data:
```

```bash
docker compose up -d
```

#### Build Locally

```bash
docker build -t lobbyha .
docker run -d -p 3000:3000 -v lobbyha-data:/data lobbyha
```

#### Custom Port

```bash
docker run -d -p 8080:8080 -e PORT=8080 -v lobbyha-data:/data ghcr.io/enishoca/lobbyha:latest
```

---

### Option 3: System Service (Linux / macOS)

Install LobbyHA as a background service that starts on boot.

#### Automated Install

```bash
git clone https://github.com/enishoca/LobbyHA.git
cd LobbyHA
sudo ./scripts/install-service.sh
```

Optional flags:

```bash
sudo ./scripts/install-service.sh --port 8080
```

#### Linux (systemd)

The install script:
1. Creates a `lobbyha` system user
2. Copies files to `/opt/lobbyha`
3. Installs npm dependencies and builds the dashboard
4. Installs and enables a systemd service

**Service management:**

```bash
sudo systemctl status lobbyha    # Check status
sudo systemctl restart lobbyha   # Restart
sudo systemctl stop lobbyha      # Stop
sudo journalctl -u lobbyha -f    # Follow logs
```

**Configuration** is in `/etc/default/lobbyha`:

```bash
NODE_ENV=production
PORT=3000
# LOG_LEVEL=INFO
```

#### macOS (launchd)

The install script:
1. Copies files to `/usr/local/opt/lobbyha`
2. Installs dependencies and builds
3. Installs a LaunchAgent plist

**Service management:**

```bash
launchctl list | grep lobbyha                                    # Status
launchctl unload ~/Library/LaunchAgents/com.lobbyha.plist        # Stop
launchctl load ~/Library/LaunchAgents/com.lobbyha.plist          # Start
tail -f /usr/local/var/log/lobbyha.log                           # Logs
```

#### Uninstall

```bash
sudo ./scripts/install-service.sh --uninstall
```

---

## Configuration

### CLI Arguments

```
lobbyha [options]

Options:
  --port, -p <number>      Port to listen on (default: 3000)
  --data-dir, -d <path>    Data directory for database (default: ./data)
  --help, -h               Show help
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `HA_URL` | Home Assistant URL | `http://localhost:8123` |
| `HA_TOKEN` | Long-lived access token | *(none)* |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARN`, `ERROR` | `INFO` |

### Priority Order

Port is determined by (highest to lowest priority):

1. `--port` CLI argument
2. `PORT` environment variable
3. Port stored in database (set via admin UI)
4. Default: `3000`

### Admin UI

All settings (including port) can also be changed from the **Admin Dashboard → Settings** panel at `/admin`.

---

## First-Run Setup

1. Open `http://localhost:3000` — you'll be redirected to the setup wizard.
2. Enter your **Home Assistant URL** (e.g., `http://homeassistant.local:8123`).
3. Enter a **long-lived access token** from HA.
4. Set an **admin password**.
5. *(Optional)* Configure **guest PINs**.
6. Done! You'll be redirected to the admin dashboard.

### Curate Your Dashboard

1. Create **Areas** to organize entities (e.g., Living Room, Kitchen).
2. Use **Discover** to browse available entities.
3. Assign entities to areas using the dropdown selector.
4. Reorder entities with arrow buttons or drag & drop.
5. Share the **QR code** with guests for instant access.

### Guest PIN Access

- Open **Admin → Settings → Guest PIN Access**
- Toggle **Require PIN** on
- Add PINs — each can be **permanent** or **7-day expiring**
- Click the badge on a PIN to toggle between permanent/7-day
- Changes save automatically

---

## URL Routes

| Path | Purpose | Auth |
|------|---------|------|
| `/` | Guest dashboard | PIN (if enabled) |
| `/admin` | Admin dashboard | Admin password |
| `/setup` | Setup wizard | None (first run only) |
| `/health` | Health check endpoint | None |

---

## Project Structure

```
LobbyHA/
├── bin/
│   └── lobbyha.mjs         # CLI entry point
├── packages/
│   ├── server/              # Express API + WebSocket proxy + SQLite
│   │   └── src/
│   │       ├── routes/      # API endpoints
│   │       ├── middleware/   # Auth, guest PIN
│   │       ├── server.ts    # Main entry (CLI parsing, Express setup)
│   │       ├── config.ts    # Configuration management
│   │       ├── db.ts        # sql.js database layer
│   │       └── ws-proxy.ts  # WebSocket relay
│   └── dashboard/           # React 19 + Vite 6 + HAKit
│       └── src/
│           ├── admin/       # Admin components
│           ├── guest/       # Guest dashboard
│           ├── components/  # Shared components
│           └── shared/      # Utilities, types
├── service/
│   ├── lobbyha.service      # systemd unit file
│   └── com.lobbyha.plist    # macOS LaunchAgent
├── scripts/
│   └── install-service.sh   # Service installer (Linux/macOS)
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose config
├── data/                    # SQLite database (auto-created)
└── package.json             # Workspace root
```

---

## Design Trade-offs

- Guest UI is **read-only** — intentional for kiosk/shared devices.
- Admin authentication uses a local password (PBKDF2 SHA-512, 100k iterations).
- Home Assistant URL is **never exposed** to the browser.
- Running LobbyHA requires the server process (no static HTML export).

---

## Acknowledgements

Built on **[HAKit](https://github.com/shannonhochkins/ha-component-kit)** by **Shannon Hochkins** — the React framework for Home Assistant that made this dashboard possible.

---

## License

MIT
