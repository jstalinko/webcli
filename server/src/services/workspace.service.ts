import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../db.js';
import { CONFIG } from '../config.js';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  user_id: string;
  root_path: string;
  created_at: string;
  updated_at: string;
}

export class WorkspaceService {
  static createWorkspace(userId: string, name: string, description: string = ''): Workspace {
    const id = crypto.randomUUID();
    const rootPath = path.join(CONFIG.WORKSPACES_ROOT, userId, id);
    const now = new Date().toISOString();

    // Create physical workspace directory
    fs.mkdirSync(rootPath, { recursive: true });

    // Seed welcoming starter project files
    this.seedStarterFiles(rootPath, name);

    const stmt = db.prepare(`
      INSERT INTO workspaces (id, name, description, user_id, root_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, description, userId, rootPath, now, now);

    return {
      id,
      name,
      description,
      user_id: userId,
      root_path: rootPath,
      created_at: now,
      updated_at: now,
    };
  }

  static getUserWorkspaces(userId: string): Workspace[] {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE user_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Workspace[];
  }

  static getWorkspace(workspaceId: string, userId: string): Workspace | null {
    const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ? AND user_id = ?');
    const ws = stmt.get(workspaceId, userId) as Workspace | undefined;
    return ws || null;
  }

  static deleteWorkspace(workspaceId: string, userId: string): boolean {
    const ws = this.getWorkspace(workspaceId, userId);
    if (!ws) return false;

    // Remove from db
    const stmt = db.prepare('DELETE FROM workspaces WHERE id = ? AND user_id = ?');
    stmt.run(workspaceId, userId);

    // Remove physical files
    try {
      if (fs.existsSync(ws.root_path)) {
        fs.rmSync(ws.root_path, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Failed to clean up workspace directory ${ws.root_path}:`, err);
    }

    return true;
  }

  private static seedStarterFiles(rootPath: string, _workspaceName: string) {
    // Seed single hello.sh file
    const helloContent = 'echo "Hello world from webCLI"\n';
    fs.writeFileSync(path.join(rootPath, 'hello.sh'), helloContent, { mode: 0o755 });
  }
}
