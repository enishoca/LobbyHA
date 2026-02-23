#!/usr/bin/env node

/**
 * LobbyHA CLI entry point.
 *
 * Launches the server with tsx so TypeScript runs directly.
 * All CLI arguments (--port, --data-dir, etc.) are forwarded.
 *
 * Usage:
 *   lobbyha --port 8080
 *   lobbyha --data-dir /var/lib/lobbyha
 *   lobbyha --help
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const server = join(root, 'packages', 'server', 'src', 'server.ts');

const child = spawn(
  process.execPath,
  ['--import', 'tsx', server, ...process.argv.slice(2)],
  { stdio: 'inherit', cwd: root, env: { ...process.env } },
);

child.on('close', (code) => process.exit(code ?? 1));
