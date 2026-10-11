import React, { useState, useRef } from 'react';
import { useFile } from '../../context/FileContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { FileItem } from './FileItem';
import { FileContextMenu } from './FileContextMenu';
import type { FileNode } from '../../types';
import { api } from '../../api/client';
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  Upload,
  Eye,
  EyeOff,
  FolderOpen,
} from 'lucide-react';

export const FileTree: React.FC = () => {
  const {
    files,
    activeFilePath,
    showHidden,
    setShowHidden,
    openFile,
    createFile,
    createFolder,
    renameItem,
    deleteItem,
    refreshFiles,
    isLoading,
  } = useFile();

  const { currentWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: FileNode | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleNewFile = (targetDir: string = '') => {
    const filename = prompt('Enter new file name:');
    if (!filename || !filename.trim()) return;
    const cleanPath = targetDir ? `${targetDir}/${filename.trim()}` : filename.trim();
    createFile(cleanPath);
  };

  const handleNewFolder = (targetDir: string = '') => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;
    const cleanPath = targetDir ? `${targetDir}/${folderName.trim()}` : folderName.trim();
    createFolder(cleanPath);
  };

  const handleRename = (node: FileNode) => {
    const currentName = node.name;
    const newName = prompt(`Rename "${currentName}" to:`, currentName);
    if (!newName || newName.trim() === currentName) return;

    const parentDir = node.path.split('/').slice(0, -1).join('/');
    const newPath = parentDir ? `${parentDir}/${newName.trim()}` : newName.trim();
    renameItem(node.path, newPath);
  };

  const handleDelete = (node: FileNode) => {
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete "${node.name}"?`);
    if (confirmDelete) {
      deleteItem(node.path);
    }
  };

  const handleDownload = (node: FileNode) => {
    if (!currentWorkspace) return;
    const downloadUrl = api.getDownloadUrl(currentWorkspace.id, node.path);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = node.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentWorkspace) return;

    try {
      await api.uploadFile(currentWorkspace.id, '', file);
      await refreshFiles();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="ide-sidebar"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          handleContextMenu(e, null);
        }
      }}
    >
      {/* Sidebar Header & Action Toolbar */}
      <div className="ide-sidebar-header">
        <span>Files</span>
        <div className="ide-sidebar-actions">
          <button
            className="ide-icon-btn"
            title="New File"
            onClick={() => handleNewFile('')}
          >
            <FilePlus size={14} />
          </button>
          <button
            className="ide-icon-btn"
            title="New Folder"
            onClick={() => handleNewFolder('')}
          >
            <FolderPlus size={14} />
          </button>
          <button
            className="ide-icon-btn"
            title="Upload File"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
          </button>
          <button
            className="ide-icon-btn"
            title={showHidden ? 'Hide Hidden Files' : 'Show Hidden Files'}
            onClick={() => setShowHidden((prev) => !prev)}
          >
            {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            className="ide-icon-btn"
            title="Refresh Files (F5)"
            onClick={() => refreshFiles()}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-anim' : ''} />
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Hierarchical File Tree */}
      <div className="ide-file-tree">
        {files.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.74rem' }}>
            <FolderOpen size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p>Workspace is empty</p>
            <button
              onClick={() => handleNewFile('')}
              style={{
                marginTop: '10px',
                background: 'rgba(255, 23, 68, 0.12)',
                border: '1px solid var(--red-border)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              + Create First File
            </button>
          </div>
        ) : (
          files.map((node) => (
            <FileItem
              key={node.path}
              node={node}
              activePath={activeFilePath}
              showHidden={showHidden}
              onOpen={openFile}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};
