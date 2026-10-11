import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateUser, AuthRequest } from '../auth.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { FileService } from '../services/file.service.js';
import { resolveSafeWorkspacePath, SecurityError } from '../security.js';

export const fileRouter = Router();

fileRouter.use(authenticateUser);

// Middleware to verify workspace authorization and attach workspace root
function requireWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
  const workspaceId = String(req.params.workspaceId || req.params.id);
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID is required.' });
  }

  const workspace = WorkspaceService.getWorkspace(workspaceId, req.user!.id);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or unauthorized.' });
  }

  (req as any).workspace = workspace;
  next();
}

// List workspace directory tree
fileRouter.get('/:workspaceId/files', requireWorkspace, (req: any, res) => {
  try {
    const depth = parseInt(req.query.depth as string || '6', 10);
    const subPath = (req.query.path as string) || '';
    const tree = FileService.listFileTree(req.workspace.root_path, subPath, depth);
    res.json({ files: tree });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// Read file content
fileRouter.get('/:workspaceId/file', requireWorkspace, (req: any, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Query parameter "path" is required.' });
    }

    const result = FileService.readFile(req.workspace.root_path, filePath);
    res.json(result);
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 404;
    res.status(status).json({ error: err.message });
  }
});

// Write / Save file content
fileRouter.put('/:workspaceId/file', requireWorkspace, (req: any, res) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Fields "path" and "content" are required.' });
    }

    FileService.writeFile(req.workspace.root_path, filePath, content);
    res.json({ message: 'File saved successfully.', path: filePath });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});

// Create empty file
fileRouter.post('/:workspaceId/file', requireWorkspace, (req: any, res) => {
  try {
    const { path: filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'Field "path" is required.' });
    }

    FileService.createFile(req.workspace.root_path, filePath);
    res.status(201).json({ message: 'File created successfully.', path: filePath });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Create directory
fileRouter.post('/:workspaceId/folder', requireWorkspace, (req: any, res) => {
  try {
    const { path: folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'Field "path" is required.' });
    }

    FileService.createFolder(req.workspace.root_path, folderPath);
    res.status(201).json({ message: 'Folder created successfully.', path: folderPath });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Rename file or folder
fileRouter.post('/:workspaceId/rename', requireWorkspace, (req: any, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Both "oldPath" and "newPath" are required.' });
    }

    FileService.renameItem(req.workspace.root_path, oldPath, newPath);
    res.json({ message: 'Renamed successfully.', oldPath, newPath });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Delete file or folder
fileRouter.delete('/:workspaceId/file', requireWorkspace, (req: any, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Query parameter "path" is required.' });
    }

    FileService.deleteItem(req.workspace.root_path, filePath);
    res.json({ message: 'Item deleted successfully.', path: filePath });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

// Search files
fileRouter.get('/:workspaceId/search', requireWorkspace, (req: any, res) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.json({ results: [] });
    }

    const results = FileService.searchFiles(req.workspace.root_path, query);
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
fileRouter.get('/:workspaceId/download', requireWorkspace, (req: any, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Query parameter "path" is required.' });
    }

    const safePath = resolveSafeWorkspacePath(req.workspace.root_path, filePath, true);
    res.download(safePath, path.basename(safePath));
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 404;
    res.status(status).json({ error: err.message });
  }
});

// File upload setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

fileRouter.post('/:workspaceId/upload', requireWorkspace, upload.single('file'), (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const targetDir = (req.body.targetDir as string) || '';
    const filename = req.file.originalname;
    const destRelPath = targetDir ? `${targetDir}/${filename}` : filename;
    const safeDestPath = resolveSafeWorkspacePath(req.workspace.root_path, destRelPath, false);

    const dir = path.dirname(safeDestPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(safeDestPath, req.file.buffer);
    res.status(201).json({ message: 'File uploaded successfully.', path: destRelPath });
  } catch (err: any) {
    const status = err instanceof SecurityError ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
});
