import { Router } from 'express';
import crypto from 'crypto';
import { authenticateUser, AuthRequest } from '../auth.js';
import { WorkspaceService } from '../services/workspace.service.js';
import { PtyService } from '../services/pty.service.js';

export const terminalRouter = Router();

terminalRouter.use(authenticateUser);

// List active terminals in workspace
terminalRouter.get('/:workspaceId/terminals', (req: AuthRequest, res) => {
  const workspaceId = String(req.params.workspaceId);
  const workspace = WorkspaceService.getWorkspace(workspaceId, req.user!.id);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or unauthorized.' });
  }

  const sessions = PtyService.listSessions(workspaceId, req.user!.id);
  res.json({ sessions });
});

// Create new terminal session ID
terminalRouter.post('/:workspaceId/terminals', (req: AuthRequest, res) => {
  const workspaceId = String(req.params.workspaceId);
  const workspace = WorkspaceService.getWorkspace(workspaceId, req.user!.id);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or unauthorized.' });
  }

  const sessionId = crypto.randomUUID();
  res.status(201).json({ sessionId, workspaceId });
});

// Terminate terminal session
terminalRouter.delete('/:workspaceId/terminals/:sessionId', (req: AuthRequest, res) => {
  const workspaceId = String(req.params.workspaceId);
  const sessionId = String(req.params.sessionId);
  const workspace = WorkspaceService.getWorkspace(workspaceId, req.user!.id);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found or unauthorized.' });
  }

  const closed = PtyService.closeSession(sessionId, req.user!.id);
  res.json({ closed, sessionId });
});
