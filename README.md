# WEBCLI — High-Performance Cloud Development Environment & Real Linux Terminal

> **WEBCLI** is a production-oriented cloud development environment featuring a real interactive Linux terminal (PTY), Monaco code editor, live file explorer, multi-tab workspace, and user authentication, styled with our custom **Purple Neon Cyberdark Design System**.

---

## ⚡ Architectural Highlights

1. **Real Linux PTY (Not a Simulation)**:
   - Uses `node-pty` to spawn real Linux shells (`/bin/bash` or `$SHELL`).
   - Supports interactive terminal apps (`vim`, `nano`, `htop`, Python REPL, Node.js), ANSI colors, pipes, redirection, process control (`Ctrl+C`, `Ctrl+D`), and dynamic window resizing (`fitAddon`).
   - Supports interactive `sudo` password prompts directly through the PTY.

2. **Monaco Code Editor**:
   - Engine used by VS Code, configured with custom Purple Neon Cyberdark theme matching the application design tokens.
   - Tabs with dirty state detection, unsaved change warnings, breadcrumbs, line numbers, bracket pair colorization, and `Ctrl+S` disk synchronization.

3. **Live Filesystem Synchronization**:
   - Built-in file system watcher (`chokidar`) streaming real-time events over WebSockets.
   - Commands executed in the terminal (e.g. `mkdir project && touch project/main.py`) instantly appear in the file tree without page reloads.

4. **Security & Workspace Isolation**:
   - Every workspace operates within an isolated directory tree.
   - Backend enforces strict path validation preventing path traversal (`../`) and symlink escapes (canonical `realpath` resolution).
   - Cross-user tenant isolation: Users cannot access or attach to another user's workspace or terminal sessions.

5. **Visual Design System**:
   - Custom-crafted **Purple Neon Cyberdark** design system (`#06030c` deep obsidian base, `#0c0717` surface, `#b026ff` electric violet neon glow, and JetBrains Mono typography).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Monaco Editor (`@monaco-editor/react`), XTerm.js (`@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`), Lucide Icons.
- **Backend**: Node.js 20, TypeScript, Express, WebSocket (`ws`), `node-pty`, SQLite (`better-sqlite3` with WAL mode).
- **Security & Auth**: JWT, `bcryptjs`, canonical path traversal validators.
- **Testing**: Vitest, Supertest, React Testing Library, JSDOM.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+
- **Linux Tools**: `bash`, `gcc`, `g++`, `make`, `python3` (for `node-pty` native compilation)

### 2. Installation
```bash
# Clone the repository and install root & client dependencies
npm install
cd client && npm install && cd ..
```

### 3. Account Management via `./webcli.sh`
Web registration is disabled by default for server security. Create your initial admin or developer user via the CLI tool:

```bash
# Launch interactive account management menu
./webcli.sh

# Or create directly via command line arguments:
./webcli.sh create <username> <email> <password>

# Available administration commands:
./webcli.sh list
./webcli.sh reset <username> <new_password>
./webcli.sh delete <username>
```

### 4. Running in Development
You can run the backend and client concurrently:
```bash
# Terminal 1: Backend server with hot-reload (port 3000)
npm run dev

# Terminal 2: Frontend Vite development server (port 5173, with API proxy)
npm run client
```

### 5. Production Build & Execution
```bash
# Compile both the React client and the TypeScript server
npm run build

# Start the unified production server (serves API, WebSocket, and SPA on port 3000)
npm start
```

Access the IDE at: **`http://localhost:3000`**

---

## 🧪 Running Automated Tests

WEBCLI includes comprehensive integration and unit tests covering:
- Authentication & JWT validation
- Duplicate user prevention
- Multi-user cross-workspace authorization isolation
- Filesystem CRUD (read, write, create, rename, delete)
- Path traversal (`../../etc/passwd`) & symlink escape prevention
- Real Linux PTY lifecycle & command execution
- Frontend component rendering and dirty state tracking

```bash
npm test
```

---

## 🐳 Docker & Docker Compose Deployment

Run WEBCLI in an isolated Linux container:

```bash
# Build and run with Docker Compose
docker compose up -d --build
```

- Accessible at `http://localhost:3000`
- Data and workspaces are stored on persistent named volumes: `webcli-data` and `webcli-workspaces`.
- Runs under an isolated `webcli` user with configurable sudo privileges.

---

## 🔒 Security & Sudo Management

### Terminal Execution Model
- Terminal sessions run directly against the Linux host or container environment in which the server is running.
- When deployed via Docker, commands run inside the Docker container, isolating the host filesystem.
- When `sudo` is required (e.g., `sudo apt-get install <pkg>`), the user is prompted interactively in the terminal. No passwords are ever stored or logged by WebCLI.

### Workspace Root Enforcement
All file operations validate paths using canonical path resolution:
```ts
resolveSafeWorkspacePath(workspaceRoot, relativePath, mustExist)
```
Any attempt to reference paths containing null bytes, path traversal tokens (`..`), or symlinks resolving outside the user's workspace directory immediately throws a `403 Forbidden` security exception.

---

## ⌨️ Default Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+S` / `Cmd+S` | Save active file |
| `Ctrl+P` / `Cmd+P` | Quick Open file search |
| `Ctrl+\`` | Toggle terminal panel |
| `Ctrl+Shift+T` | Open new terminal tab |
| `Ctrl+W` | Close active editor tab |
| `Ctrl+L` | Clear terminal screen |
| `F5` | Refresh file tree |
| `F2` | Rename selected file |
| `Ctrl+C` | Send SIGINT to running process |

---

## 📂 Project Directory Structure

```
webcli/
├── client/                     # Frontend Vite + React + Monaco + xterm application
│   ├── src/
│   │   ├── api/                # HTTP API Client
│   │   ├── components/         # TopNavBar, Editor, Terminal, FileTree, Modals
│   │   ├── context/            # Auth, Workspace, File, Terminal Contexts
│   │   ├── styles/             # Reference Cyber Theme & IDE CSS
│   │   ├── types/              # Frontend TypeScript Interfaces
│   │   ├── App.tsx             # Cloud9 IDE Main Layout
│   │   └── main.tsx            # React DOM Entrypoint
│   └── package.json
├── server/                     # Backend Node.js + Express + WebSocket + PTY
│   └── src/
│       ├── routes/             # Auth, Workspace, File, Terminal REST routes
│       ├── services/           # PTY Manager, Workspace Service, File Service, Watcher
│       ├── auth.ts             # JWT and Password Hashing
│       ├── config.ts           # Environment Configuration
│       ├── db.ts               # SQLite Database with WAL
│       ├── security.ts         # Path Traversal and Symlink Validator
│       ├── websocket.ts        # Authenticated Terminal & Event WebSocket Server
│       └── index.ts            # Server Entrypoint
├── tests/                      # Automated Vitest Test Suite
│   ├── server.test.ts          # Backend Integration, Security, and PTY tests
│   └── frontend.test.tsx       # Frontend Component & State tests
├── Dockerfile                  # Multi-stage production container
├── docker-compose.yml          # Docker Compose deployment setup
├── .env.example                # Example configuration
└── package.json                # Root scripts and server dependencies
```

---

## 📜 License
ISC License.
