import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { FileNode, OpenFile } from '../types';
import { api } from '../api/client';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from './AuthContext';

interface FileContextType {
  files: FileNode[];
  openFiles: OpenFile[];
  activeFilePath: string | null;
  selectedPath: string | null;
  activeFile: OpenFile | null;
  showHidden: boolean;
  isLoading: boolean;
  setSelectedPath: (path: string | null) => void;
  setShowHidden: (show: boolean | ((prev: boolean) => boolean)) => void;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string, force?: boolean) => boolean;
  closeAllFiles: () => void;
  setActiveFilePath: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  saveFile: (path?: string) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  renameItem: (oldPath: string, newPath: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sql':
      return 'sql';
    case 'go':
      return 'go';
    case 'rs':
      return 'rust';
    case 'java':
      return 'java';
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'php':
      return 'php';
    default:
      return 'plaintext';
  }
}

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const openFilesRef = useRef(openFiles);
  openFilesRef.current = openFiles;

  const openFile = useCallback(async (path: string) => {
    if (!currentWorkspace) return;

    // Check if already open
    const existing = openFilesRef.current.find((f) => f.path === path);
    if (existing) {
      setActiveFilePath(path);
      setSelectedPath(path);
      return;
    }

    try {
      const res = await api.readFile(currentWorkspace.id, path);
      if (res.isBinary) {
        alert('Binary file cannot be viewed in text editor.');
        return;
      }

      const fileName = path.split('/').pop() || path;
      const newFile: OpenFile = {
        path,
        name: fileName,
        content: res.content,
        originalContent: res.content,
        isDirty: false,
        language: getLanguageFromPath(path),
      };

      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFilePath(path);
      setSelectedPath(path);
    } catch (err: any) {
      console.error(`Could not open file: ${err.message}`);
    }
  }, [currentWorkspace]);

  const refreshFiles = useCallback(async () => {
    if (!currentWorkspace) {
      setFiles([]);
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.getFileTree(currentWorkspace.id);
      setFiles(data.files);

      // Auto-open hello.sh if no file is currently open
      if (openFilesRef.current.length === 0 && data.files.length > 0) {
        const hello = data.files.find((f) => f.name === 'hello.sh' && !f.isDirectory);
        const toOpen = hello || data.files.find((f) => !f.isDirectory);
        if (toOpen) {
          openFile(toOpen.path);
        }
      }
    } catch (err) {
      console.error('Failed to load file tree:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, openFile]);

  useEffect(() => {
    setOpenFiles([]);
    setActiveFilePath(null);
    refreshFiles();
  }, [currentWorkspace, refreshFiles]);

  // Real-time synchronization via WebSocket
  useEffect(() => {
    if (!currentWorkspace || !user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = api.getToken();
    if (!token) return;

    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'watch_workspace',
        workspaceId: currentWorkspace.id,
      }));
    };

    ws.onmessage = async (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'fs_event' && msg.workspaceId === currentWorkspace.id) {
          // Auto-refresh file tree
          refreshFiles();

          // If the changed file is currently open and not dirty, reload its content
          const targetPath = msg.path;
          const openFileItem = openFilesRef.current.find((f) => f.path === targetPath);
          if (openFileItem && !openFileItem.isDirty && (msg.event === 'change' || msg.event === 'add')) {
            try {
              const res = await api.readFile(currentWorkspace.id, targetPath);
              setOpenFiles((prev) =>
                prev.map((f) =>
                  f.path === targetPath
                    ? { ...f, content: res.content, originalContent: res.content, isDirty: false }
                    : f
                )
              );
            } catch {}
          }
        }
      } catch (err) {
        console.error('WebSocket sync parse error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [currentWorkspace, user, refreshFiles]);

  const closeFile = (path: string, force: boolean = false): boolean => {
    const file = openFiles.find((f) => f.path === path);
    if (!file) return true;

    if (file.isDirty && !force) {
      const discard = window.confirm(`File "${file.name}" has unsaved changes. Discard changes?`);
      if (!discard) return false;
    }

    const nextFiles = openFiles.filter((f) => f.path !== path);
    setOpenFiles(nextFiles);

    if (activeFilePath === path) {
      const closedIdx = openFiles.findIndex((f) => f.path === path);
      const nextActive = nextFiles[Math.min(closedIdx, nextFiles.length - 1)] || null;
      setActiveFilePath(nextActive ? nextActive.path : null);
    }

    return true;
  };

  const closeAllFiles = () => {
    for (const file of openFiles) {
      if (file.isDirty) {
        const discard = window.confirm(`File "${file.name}" has unsaved changes. Discard?`);
        if (!discard) return;
      }
    }
    setOpenFiles([]);
    setActiveFilePath(null);
  };

  const updateFileContent = (path: string, content: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.path === path) {
          return {
            ...f,
            content,
            isDirty: content !== f.originalContent,
          };
        }
        return f;
      })
    );
  };

  const saveFile = async (path?: string) => {
    const targetPath = path || activeFilePath;
    if (!targetPath || !currentWorkspace) return;

    const file = openFiles.find((f) => f.path === targetPath);
    if (!file) return;

    try {
      await api.writeFile(currentWorkspace.id, targetPath, file.content);
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === targetPath
            ? { ...f, originalContent: f.content, isDirty: false }
            : f
        )
      );
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    }
  };

  const createFile = async (path: string) => {
    if (!currentWorkspace) return;
    await api.createFile(currentWorkspace.id, path);
    await refreshFiles();
    await openFile(path);
  };

  const createFolder = async (path: string) => {
    if (!currentWorkspace) return;
    await api.createFolder(currentWorkspace.id, path);
    await refreshFiles();
  };

  const renameItem = async (oldPath: string, newPath: string) => {
    if (!currentWorkspace) return;
    await api.renameItem(currentWorkspace.id, oldPath, newPath);
    await refreshFiles();

    // Update open files if renamed
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.path === oldPath) {
          return {
            ...f,
            path: newPath,
            name: newPath.split('/').pop() || newPath,
            language: getLanguageFromPath(newPath),
          };
        }
        return f;
      })
    );

    if (activeFilePath === oldPath) {
      setActiveFilePath(newPath);
    }
  };

  const deleteItem = async (path: string) => {
    if (!currentWorkspace) return;
    await api.deleteItem(currentWorkspace.id, path);
    await refreshFiles();

    // Close if open
    closeFile(path, true);
  };

  const activeFile = openFiles.find((f) => f.path === activeFilePath) || null;

  return (
    <FileContext.Provider
      value={{
        files,
        openFiles,
        activeFilePath,
        selectedPath,
        activeFile,
        showHidden,
        isLoading,
        setSelectedPath,
        setShowHidden,
        openFile,
        closeFile,
        closeAllFiles,
        setActiveFilePath,
        updateFileContent,
        saveFile,
        createFile,
        createFolder,
        renameItem,
        deleteItem,
        refreshFiles,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error('useFile must be used within a FileProvider');
  return context;
};
