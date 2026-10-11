import fs from 'fs';
import path from 'path';
import { resolveSafeWorkspacePath } from '../security.js';

export interface FileNode {
  name: string;
  path: string; // relative to workspace root, using forward slashes
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

export class FileService {
  static listFileTree(workspaceRoot: string, relativeDir: string = '', depth: number = 5): FileNode[] {
    const targetDir = resolveSafeWorkspacePath(workspaceRoot, relativeDir, true);
    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      return [];
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Allow viewing hidden files (dotfiles), but skip .git if very large or internal
      const entryRelPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const fullPath = path.join(targetDir, entry.name);

      let isDirectory = entry.isDirectory();
      let size = 0;
      let modifiedAt = new Date().toISOString();

      try {
        const entryStat = fs.statSync(fullPath);
        isDirectory = entryStat.isDirectory();
        size = entryStat.size;
        modifiedAt = entryStat.mtime.toISOString();
      } catch (err) {
        // Skip unreadable files
        continue;
      }

      const node: FileNode = {
        name: entry.name,
        path: entryRelPath.replace(/\\/g, '/'),
        isDirectory,
        size,
        modifiedAt,
      };

      if (isDirectory && depth > 0) {
        // Recurse up to max depth
        node.children = this.listFileTree(workspaceRoot, entryRelPath, depth - 1);
      }

      nodes.push(node);
    }

    // Sort: directories first, then alphabetical
    nodes.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory ? -1 : 1;
    });

    return nodes;
  }

  static readFile(workspaceRoot: string, relativePath: string): { content: string; size: number; isBinary: boolean } {
    const safePath = resolveSafeWorkspacePath(workspaceRoot, relativePath, true);
    const stat = fs.statSync(safePath);

    if (stat.isDirectory()) {
      throw new Error('Path is a directory, not a file');
    }

    const buffer = fs.readFileSync(safePath);
    // Detect binary files by checking for null bytes in initial sample
    const isBinary = buffer.slice(0, 1024).includes(0);

    return {
      content: isBinary ? buffer.toString('base64') : buffer.toString('utf8'),
      size: stat.size,
      isBinary,
    };
  }

  static writeFile(workspaceRoot: string, relativePath: string, content: string): void {
    const safePath = resolveSafeWorkspacePath(workspaceRoot, relativePath, false);
    const dir = path.dirname(safePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file atomically via temp file or direct write
    fs.writeFileSync(safePath, content, 'utf8');
  }

  static createFile(workspaceRoot: string, relativePath: string): void {
    const safePath = resolveSafeWorkspacePath(workspaceRoot, relativePath, false);
    if (fs.existsSync(safePath)) {
      throw new Error(`File already exists: ${relativePath}`);
    }

    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(safePath, '', 'utf8');
  }

  static createFolder(workspaceRoot: string, relativePath: string): void {
    const safePath = resolveSafeWorkspacePath(workspaceRoot, relativePath, false);
    if (fs.existsSync(safePath)) {
      throw new Error(`Folder already exists: ${relativePath}`);
    }

    fs.mkdirSync(safePath, { recursive: true });
  }

  static renameItem(workspaceRoot: string, oldRelativePath: string, newRelativePath: string): void {
    const oldSafePath = resolveSafeWorkspacePath(workspaceRoot, oldRelativePath, true);
    const newSafePath = resolveSafeWorkspacePath(workspaceRoot, newRelativePath, false);

    if (fs.existsSync(newSafePath)) {
      throw new Error(`Destination already exists: ${newRelativePath}`);
    }

    const newDir = path.dirname(newSafePath);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }

    fs.renameSync(oldSafePath, newSafePath);
  }

  static deleteItem(workspaceRoot: string, relativePath: string): void {
    const safePath = resolveSafeWorkspacePath(workspaceRoot, relativePath, true);
    fs.rmSync(safePath, { recursive: true, force: true });
  }

  static searchFiles(workspaceRoot: string, query: string, maxResults: number = 30): { path: string; name: string; isDirectory: boolean }[] {
    const results: { path: string; name: string; isDirectory: boolean }[] = [];
    const qLower = query.toLowerCase();

    function walk(currentDir: string, relDir: string) {
      if (results.length >= maxResults) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        const entryRel = relDir ? `${relDir}/${entry.name}` : entry.name;
        if (entry.name.toLowerCase().includes(qLower)) {
          results.push({
            path: entryRel.replace(/\\/g, '/'),
            name: entry.name,
            isDirectory: entry.isDirectory(),
          });
        }

        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          walk(path.join(currentDir, entry.name), entryRel);
        }
      }
    }

    walk(workspaceRoot, '');
    return results;
  }
}
