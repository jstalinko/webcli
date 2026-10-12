import * as pty from 'node-pty';
import { CONFIG } from '../config.js';

export interface TerminalListener {
  id: string;
  onData: (data: string) => void;
  onExit: (code: number) => void;
}

export interface TerminalSession {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  ptyProcess: pty.IPty;
  createdAt: Date;
  buffer: string[];
  totalBufferLength: number;
  listeners: Map<string, TerminalListener>;
  isExited: boolean;
  exitCode?: number;
}

export class PtyService {
  private static sessions: Map<string, TerminalSession> = new Map();
  private static readonly MAX_BUFFER_LENGTH = 1024 * 1024; // 1MB output history buffer per session

  static createSession(
    sessionId: string,
    workspaceId: string,
    userId: string,
    cwd: string,
    cols: number = 80,
    rows: number = 24,
    onData?: (data: string) => void,
    onExit?: (code: number) => void,
    listenerId: string = 'default',
    title?: string
  ): TerminalSession {
    // If session already exists, attach to it instead of killing it!
    const existing = this.sessions.get(sessionId);
    if (existing) {
      if (existing.userId !== userId) {
        throw new Error('Unauthorized access to terminal session');
      }

      // Resize PTY if cols & rows provided
      if (cols && rows) {
        try {
          existing.ptyProcess.resize(Math.max(10, cols), Math.max(5, rows));
        } catch {}
      }

      if (title && !existing.title) {
        existing.title = title;
      }

      // Register listener
      if (onData && onExit) {
        existing.listeners.set(listenerId, {
          id: listenerId,
          onData,
          onExit,
        });

        // Replay output buffer history immediately so reconnected clients see all previous output
        const history = existing.buffer.join('');
        if (history.length > 0) {
          const CHUNK_SIZE = 64 * 1024;
          if (history.length <= CHUNK_SIZE) {
            onData(history);
          } else {
            for (let i = 0; i < history.length; i += CHUNK_SIZE) {
              onData(history.slice(i, i + CHUNK_SIZE));
            }
          }
        }

        if (existing.isExited && existing.exitCode !== undefined) {
          onExit(existing.exitCode);
        }
      }

      return existing;
    }

    const shell = CONFIG.DEFAULT_SHELL;

    // Set clean, robust environment for Linux terminal
    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'C.UTF-8',
      WORKSPACE_ID: workspaceId,
      HOME: process.env.HOME || '/home',
      PS1: '\\[\\033[01;31m\\]\\u@webcli\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ ',
    };

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: Math.max(10, cols || 80),
      rows: Math.max(5, rows || 24),
      cwd,
      env: env as { [key: string]: string },
    });

    const session: TerminalSession = {
      id: sessionId,
      workspaceId,
      userId,
      title: title || `Terminal ${this.sessions.size + 1}`,
      ptyProcess,
      createdAt: new Date(),
      buffer: [],
      totalBufferLength: 0,
      listeners: new Map(),
      isExited: false,
    };

    ptyProcess.onData((data: string) => {
      // Buffer output in memory so reconnecting clients can view full history
      session.buffer.push(data);
      session.totalBufferLength += data.length;

      while (session.totalBufferLength > PtyService.MAX_BUFFER_LENGTH && session.buffer.length > 1) {
        const removed = session.buffer.shift()!;
        session.totalBufferLength -= removed.length;
      }

      // Broadcast output to all attached listeners
      for (const listener of session.listeners.values()) {
        try {
          listener.onData(data);
        } catch (err) {
          console.error(`Error sending data to listener ${listener.id}:`, err);
        }
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      session.isExited = true;
      session.exitCode = exitCode;
      for (const listener of session.listeners.values()) {
        try {
          listener.onExit(exitCode);
        } catch {}
      }
      this.sessions.delete(sessionId);
    });

    if (onData && onExit) {
      session.listeners.set(listenerId, {
        id: listenerId,
        onData,
        onExit,
      });
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  static attachListener(
    sessionId: string,
    userId: string,
    listenerId: string,
    onData: (data: string) => void,
    onExit: (code: number) => void
  ): boolean {
    const session = this.getSession(sessionId, userId);
    if (!session) return false;

    session.listeners.set(listenerId, { id: listenerId, onData, onExit });

    const history = session.buffer.join('');
    if (history.length > 0) {
      const CHUNK_SIZE = 64 * 1024;
      if (history.length <= CHUNK_SIZE) {
        onData(history);
      } else {
        for (let i = 0; i < history.length; i += CHUNK_SIZE) {
          onData(history.slice(i, i + CHUNK_SIZE));
        }
      }
    }

    if (session.isExited && session.exitCode !== undefined) {
      onExit(session.exitCode);
    }
    return true;
  }

  static detachListener(sessionId: string, listenerId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.listeners.delete(listenerId);
    }
  }

  static getSession(sessionId: string, userId: string): TerminalSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    // Strict user authorization check
    if (session.userId !== userId) {
      return null;
    }
    return session;
  }

  static writeToSession(sessionId: string, userId: string, data: string): boolean {
    const session = this.getSession(sessionId, userId);
    if (!session) return false;
    try {
      session.ptyProcess.write(data);
      return true;
    } catch (err) {
      console.error(`Error writing to PTY session ${sessionId}:`, err);
      return false;
    }
  }

  static resizeSession(sessionId: string, userId: string, cols: number, rows: number): boolean {
    const session = this.getSession(sessionId, userId);
    if (!session) return false;
    try {
      session.ptyProcess.resize(Math.max(10, cols), Math.max(5, rows));
      return true;
    } catch (err) {
      console.error(`Error resizing PTY session ${sessionId}:`, err);
      return false;
    }
  }

  static closeSession(sessionId: string, userId: string): boolean {
    const session = this.getSession(sessionId, userId);
    if (!session) return false;
    try {
      session.ptyProcess.kill();
    } catch (err) {
      // Ignore if already dead
    }
    this.sessions.delete(sessionId);
    return true;
  }

  static closeAllWorkspaceSessions(workspaceId: string): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.workspaceId === workspaceId) {
        try {
          session.ptyProcess.kill();
        } catch {}
        this.sessions.delete(id);
      }
    }
  }

  static listSessions(workspaceId: string, userId: string): { id: string; title: string; createdAt: string }[] {
    const list: { id: string; title: string; createdAt: string }[] = [];
    for (const session of this.sessions.values()) {
      if (session.workspaceId === workspaceId && session.userId === userId && !session.isExited) {
        list.push({
          id: session.id,
          title: session.title,
          createdAt: session.createdAt.toISOString(),
        });
      }
    }
    return list;
  }
}
