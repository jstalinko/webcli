import { Router } from 'express';
import { authenticateUser, AuthRequest } from '../auth.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { PtyService } from '../services/pty.service.js';

export const workspaceRouter = Router();

workspaceRouter.use(authenticateUser);

// List all user workspaces
workspaceRouter.get('/', (req: AuthRequest, res) => {
  const workspaces = WorkspaceService.getUserWorkspaces(req.user!.id);
  res.json({ workspaces });
});

// Create workspace
workspaceRouter.post('/', (req: AuthRequest, res) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Workspace name is required.' });
  }

  const workspace = WorkspaceService.createWorkspace(req.user!.id, name.trim(), description || '');
  res.status(201).json({ workspace });
});

// Get workspace details
workspaceRouter.get('/:id', (req: AuthRequest, res) => {
  const id = String(req.params.id);
  const workspace = WorkspaceService.getWorkspace(id, req.user!.id);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or unauthorized.' });
  }
  res.json({ workspace });
});

// Delete workspace
workspaceRouter.delete('/:id', (req: AuthRequest, res) => {
  const id = String(req.params.id);
  // Close any running terminals for this workspace
  PtyService.closeAllWorkspaceSessions(id);

  const deleted = WorkspaceService.deleteWorkspace(id, req.user!.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Workspace not found or unauthorized.' });
  }
  res.json({ message: 'Workspace deleted successfully.' });
});
