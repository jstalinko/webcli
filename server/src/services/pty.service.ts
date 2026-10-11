import * as pty from 'node-pty';
import { CONFIG } from '../config.js';

export interface TerminalSession {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  ptyProcess: pty.IPty;
  createdAt: Date;
}

export class PtyService {
  private static sessions: Map<string, TerminalSession> = new Map();

  static createSession(
    sessionId: string,
    workspaceId: string,
    userId: string,
    cwd: string,
    cols: number = 80,
    rows: number = 24,
    onData: (data: string) => void,
    onExit: (code: number) => void
  ): TerminalSession {
    // Kill existing session with same ID if any
    if (this.sessions.has(sessionId)) {
      this.closeSession(sessionId, userId);
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

    ptyProcess.onData((data: string) => {
      onData(data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.sessions.delete(sessionId);
      onExit(exitCode);
    });

    const session: TerminalSession = {
      id: sessionId,
      workspaceId,
      userId,
      title: `Terminal ${this.sessions.size + 1}`,
      ptyProcess,
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    return session;
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
      if (session.workspaceId === workspaceId && session.userId === userId) {
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
