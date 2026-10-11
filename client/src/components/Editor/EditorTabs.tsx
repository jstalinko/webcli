import React from 'react';
import { useFile } from '../../context/FileContext';
import { X, FileCode, FileText } from 'lucide-react';

export const EditorTabs: React.FC = () => {
  const { openFiles, activeFilePath, setActiveFilePath, closeFile } = useFile();

  if (openFiles.length === 0) return null;

  return (
    <div className="ide-tabs-bar">
      {openFiles.map((file) => {
        const isActive = file.path === activeFilePath;
        return (
          <div
            key={file.path}
            className={`ide-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveFilePath(file.path)}
            onMouseDown={(e) => {
              // Middle-click to close
              if (e.button === 1) {
                e.preventDefault();
                closeFile(file.path);
              }
            }}
            title={file.path}
          >
            {file.language === 'typescript' || file.language === 'javascript' || file.language === 'python' ? (
              <FileCode size={13} style={{ color: isActive ? 'var(--red-primary)' : 'var(--text-dim)' }} />
            ) : (
              <FileText size={13} style={{ color: isActive ? 'var(--red-primary)' : 'var(--text-dim)' }} />
            )}

            <span>{file.name}</span>

            {/* Dirty Indicator or Close Button */}
            {file.isDirty ? (
              <span
                className="ide-tab-dirty-dot"
                title="Unsaved changes (Ctrl+S to save)"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
              />
            ) : (
              <button
                className="ide-tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeFile(file.path);
                }}
                title="Close tab (Ctrl+W)"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
