#!/usr/bin/env bash
set -euo pipefail

# LobbyHA — install as a system service
# Detects Linux (systemd) or macOS (launchd) and installs accordingly.

INSTALL_DIR="/opt/lobbyha"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  echo "Usage: $0 [--port PORT] [--data-dir PATH]"
  echo ""
  echo "Install LobbyHA as a system service."
  echo ""
  echo "Options:"
  echo "  --port PORT        Default port (written to /etc/default/lobbyha on Linux)"
  echo "  --data-dir PATH    Override data directory"
  echo "  --uninstall        Remove the service and installation"
  echo "  -h, --help         Show this help"
  exit 0
}

PORT=""
DATA_DIR=""
UNINSTALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --uninstall) UNINSTALL=true; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# ── Detect OS ────────────────────────────────────────────────

install_linux() {
  echo "→ Installing LobbyHA for Linux (systemd)..."

  # Create user if needed
  if ! id -u lobbyha &>/dev/null; then
    sudo useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin lobbyha
    echo "  Created system user 'lobbyha'"
  fi

  # Copy files
  sudo mkdir -p "$INSTALL_DIR"
  sudo rsync -a --exclude=node_modules --exclude=.git "$SCRIPT_DIR/" "$INSTALL_DIR/"
  sudo chown -R lobbyha:lobbyha "$INSTALL_DIR"

  # Install dependencies
  echo "  Installing npm dependencies..."
  sudo -u lobbyha bash -c "cd $INSTALL_DIR && npm install --omit=dev --legacy-peer-deps"
  echo "  Building dashboard..."
  sudo -u lobbyha bash -c "cd $INSTALL_DIR && npm run build"

  # Create data dir
  sudo mkdir -p "$INSTALL_DIR/data"
  sudo chown lobbyha:lobbyha "$INSTALL_DIR/data"

  # Environment file
  ENV_FILE="/etc/default/lobbyha"
  if [[ ! -f "$ENV_FILE" ]]; then
    sudo tee "$ENV_FILE" > /dev/null <<EOF
# LobbyHA environment configuration
NODE_ENV=production
${PORT:+PORT=$PORT}
${DATA_DIR:+DATA_DIR=$DATA_DIR}
EOF
    echo "  Created $ENV_FILE"
  fi

  # Install systemd service
  sudo cp "$INSTALL_DIR/service/lobbyha.service" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable lobbyha
  sudo systemctl start lobbyha

  echo ""
  echo "✓ LobbyHA installed and running!"
  echo "  Status:  sudo systemctl status lobbyha"
  echo "  Logs:    sudo journalctl -u lobbyha -f"
  echo "  Stop:    sudo systemctl stop lobbyha"
  echo "  Config:  $ENV_FILE"
}

uninstall_linux() {
  echo "→ Uninstalling LobbyHA (systemd)..."
  sudo systemctl stop lobbyha 2>/dev/null || true
  sudo systemctl disable lobbyha 2>/dev/null || true
  sudo rm -f /etc/systemd/system/lobbyha.service
  sudo systemctl daemon-reload
  echo "  Service removed. Data remains at $INSTALL_DIR/data"
  echo "  To fully remove: sudo rm -rf $INSTALL_DIR && sudo userdel lobbyha"
}

install_macos() {
  local install_dir="/usr/local/opt/lobbyha"
  local plist_src="$SCRIPT_DIR/service/com.lobbyha.plist"
  local plist_dst="$HOME/Library/LaunchAgents/com.lobbyha.plist"

  echo "→ Installing LobbyHA for macOS (launchd)..."

  # Copy files
  sudo mkdir -p "$install_dir"
  sudo rsync -a --exclude=node_modules --exclude=.git "$SCRIPT_DIR/" "$install_dir/"
  sudo chown -R "$(whoami)" "$install_dir"

  # Install dependencies
  echo "  Installing npm dependencies..."
  cd "$install_dir" && npm install --omit=dev --legacy-peer-deps
  echo "  Building dashboard..."
  npm run build

  # Create data dir
  mkdir -p "$install_dir/data"

  # Create log directory
  mkdir -p /usr/local/var/log

  # Update plist with correct node path
  local node_path
  node_path="$(which node)"
  sed "s|/usr/local/bin/node|$node_path|g" "$plist_src" > "$plist_dst"

  # Load the service
  launchctl load "$plist_dst"

  echo ""
  echo "✓ LobbyHA installed and running!"
  echo "  Status:  launchctl list | grep lobbyha"
  echo "  Logs:    tail -f /usr/local/var/log/lobbyha.log"
  echo "  Stop:    launchctl unload $plist_dst"
}

uninstall_macos() {
  local plist_dst="$HOME/Library/LaunchAgents/com.lobbyha.plist"
  echo "→ Uninstalling LobbyHA (launchd)..."
  launchctl unload "$plist_dst" 2>/dev/null || true
  rm -f "$plist_dst"
  echo "  Service removed. Data remains at /usr/local/opt/lobbyha/data"
  echo "  To fully remove: sudo rm -rf /usr/local/opt/lobbyha"
}

# ── Main ─────────────────────────────────────────────────────

case "$(uname -s)" in
  Linux)
    if $UNINSTALL; then uninstall_linux; else install_linux; fi
    ;;
  Darwin)
    if $UNINSTALL; then uninstall_macos; else install_macos; fi
    ;;
  *)
    echo "Unsupported OS: $(uname -s)"
    echo "Supported: Linux (systemd), macOS (launchd)"
    exit 1
    ;;
esac
