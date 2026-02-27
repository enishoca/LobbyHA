# LobbyHA — Home Assistant Add-on

Guest-facing dashboard for Home Assistant, designed for TVs, wall tablets, and shared devices.

## How it works

LobbyHA runs as a small web server inside the add-on container. It connects to your Home Assistant instance using a long-lived access token and presents a curated, read-only guest dashboard.

- **Admin UI** (`http://<HA_IP>:3000/admin`) — organize entities into areas, reorder, set visibility, manage guest PINs.
- **Guest UI** (`http://<HA_IP>:3000/`) — clean, locked-down view for shared screens.

## First-run setup

1. Start the add-on.
2. Open `http://<HA_IP>:3000/setup` in your browser.
3. Enter your Home Assistant URL (usually `http://127.0.0.1:8123` when running on the same machine).
4. Paste a long-lived access token.
5. Set an admin password.
6. Done — you'll be redirected to the admin dashboard.

## Configuration

All configuration is done through the **Setup Wizard** or the **Admin Settings** panel. The add-on options in Supervisor are minimal — only `LOG_LEVEL` is exposed.

| Option | Description | Default |
|--------|-------------|---------|
| `LOG_LEVEL` | Logging verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` | `INFO` |

## Data persistence

The add-on stores its SQLite database in `/data/lobbyha.db`. This directory is automatically persisted by Home Assistant Supervisor across add-on restarts and updates.

## Network

The add-on exposes port **3000** by default. Access the dashboard at `http://<HA_IP>:3000/`.

## More information

- [GitHub Repository](https://github.com/enishoca/LobbyHA)
- [Full README](https://github.com/enishoca/LobbyHA/blob/main/README.md)
