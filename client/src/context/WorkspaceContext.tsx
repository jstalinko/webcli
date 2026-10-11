import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Workspace } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  selectWorkspace: (id: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.getWorkspaces();
      setWorkspaces(data.workspaces);

      if (data.workspaces.length > 0) {
        const savedId = localStorage.getItem('webcli_last_workspace');
        const found = data.workspaces.find((w) => w.id === savedId);
        const selected = found || data.workspaces[0];
        setCurrentWorkspace(selected);
        localStorage.setItem('webcli_last_workspace', selected.id);
      } else {
        setCurrentWorkspace(null);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  const selectWorkspace = (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (ws) {
      setCurrentWorkspace(ws);
      localStorage.setItem('webcli_last_workspace', ws.id);
    }
  };

  const createWorkspace = async (name: string, description: string = '') => {
    const data = await api.createWorkspace(name, description);
    setWorkspaces((prev) => [data.workspace, ...prev]);
    setCurrentWorkspace(data.workspace);
    localStorage.setItem('webcli_last_workspace', data.workspace.id);
    return data.workspace;
  };

  const deleteWorkspace = async (id: string) => {
    await api.deleteWorkspace(id);
    const updated = workspaces.filter((w) => w.id !== id);
    setWorkspaces(updated);
    if (currentWorkspace?.id === id) {
      const next = updated[0] || null;
      setCurrentWorkspace(next);
      if (next) {
        localStorage.setItem('webcli_last_workspace', next.id);
      } else {
        localStorage.removeItem('webcli_last_workspace');
      }
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoading,
        selectWorkspace,
        createWorkspace,
        deleteWorkspace,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
};
