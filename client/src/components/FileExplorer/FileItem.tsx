import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  File,
  Terminal as TerminalIcon,
  FileJson,
} from 'lucide-react';
import type { FileNode } from '../../types';

interface FileItemProps {
  node: FileNode;
  depth?: number;
  activePath: string | null;
  showHidden: boolean;
  onOpen: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  node,
  depth = 0,
  activePath,
  showHidden,
  onOpen,
  onContextMenu,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter hidden files if toggle is off
  if (!showHidden && node.name.startsWith('.')) {
    return null;
  }

  const isSelected = activePath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onOpen(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  // Helper to pick icon based on file type
  const renderIcon = () => {
    if (node.isDirectory) {
      return isOpen ? (
        <FolderOpen size={14} style={{ color: '#ffb300' }} />
      ) : (
        <Folder size={14} style={{ color: '#ffb300' }} />
      );
    }

    const ext = node.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return <FileCode size={14} style={{ color: '#3178c6' }} />;
      case 'js':
      case 'jsx':
        return <FileCode size={14} style={{ color: '#f7df1e' }} />;
      case 'py':
        return <FileCode size={14} style={{ color: '#3572A5' }} />;
      case 'json':
        return <FileJson size={14} style={{ color: '#ffca28' }} />;
      case 'sh':
      case 'bash':
        return <TerminalIcon size={14} style={{ color: '#00e676' }} />;
      case 'md':
      case 'txt':
        return <FileText size={14} style={{ color: '#90caf9' }} />;
      case 'html':
      case 'css':
        return <FileCode size={14} style={{ color: '#e44d26' }} />;
      default:
        return <File size={14} style={{ color: 'var(--text-dim)' }} />;
    }
  };

  return (
    <div>
      <div
        className={`ide-tree-node ${isSelected ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={node.path}
      >
        {node.isDirectory && (
          <span style={{ display: 'flex', alignItems: 'center', marginRight: '2px', color: 'var(--text-dim)' }}>
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}

        <span className="node-icon">{renderIcon()}</span>
        <span className="node-label">{node.name}</span>
      </div>

      {node.isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              showHidden={showHidden}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};
