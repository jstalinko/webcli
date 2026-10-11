import React, { useEffect, useRef } from 'react';
import { FilePlus, FolderPlus, Edit2, Trash2, Download, Copy } from 'lucide-react';
import type { FileNode } from '../../types';

interface FileContextMenuProps {
  x: number;
  y: number;
  node: FileNode | null;
  onClose: () => void;
  onNewFile: (targetDir: string) => void;
  onNewFolder: (targetDir: string) => void;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onDownload: (node: FileNode) => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  x,
  y,
  node,
  onClose,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onDownload,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const targetDir = node ? (node.isDirectory ? node.path : node.path.split('/').slice(0, -1).join('/')) : '';

  const copyPath = () => {
    if (node) {
      navigator.clipboard.writeText(node.path);
    }
    onClose();
  };

  return (
    <div
      className="ide-context-menu"
      ref={menuRef}
      style={{
        top: Math.min(y, window.innerHeight - 220),
        left: Math.min(x, window.innerWidth - 180),
      }}
    >
      <button
        className="ide-context-menu-item"
        onClick={() => {
          onNewFile(targetDir);
          onClose();
        }}
      >
        <FilePlus size={13} style={{ color: 'var(--red-primary)' }} />
        <span>New File</span>
      </button>

      <button
        className="ide-context-menu-item"
        onClick={() => {
          onNewFolder(targetDir);
          onClose();
        }}
      >
        <FolderPlus size={13} style={{ color: 'var(--red-primary)' }} />
        <span>New Folder</span>
      </button>

      {node && (
        <>
          <div className="ide-dropdown-divider" />
          <button
            className="ide-context-menu-item"
            onClick={() => {
              onRename(node);
              onClose();
            }}
          >
            <Edit2 size={13} />
            <span>Rename (F2)</span>
          </button>

          {!node.isDirectory && (
            <button
              className="ide-context-menu-item"
              onClick={() => {
                onDownload(node);
                onClose();
              }}
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          )}

          <button className="ide-context-menu-item" onClick={copyPath}>
            <Copy size={13} />
            <span>Copy Relative Path</span>
          </button>

          <div className="ide-dropdown-divider" />
          <button
            className="ide-context-menu-item danger"
            onClick={() => {
              onDelete(node);
              onClose();
            }}
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </>
      )}
    </div>
  );
};
