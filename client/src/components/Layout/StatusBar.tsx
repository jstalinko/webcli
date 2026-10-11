import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useFile } from '../../context/FileContext';
import { useTerminal } from '../../context/TerminalContext';
import { Terminal, Shield, Folder, FileCode, CheckCircle2 } from 'lucide-react';

interface StatusBarProps {
  cursorPosition?: { lineNumber: number; column: number };
}

export const StatusBar: React.FC<StatusBarProps> = ({ cursorPosition = { lineNumber: 1, column: 1 } }) => {
  const { currentWorkspace } = useWorkspace();
  const { activeFile } = useFile();
  const { tabs, isOpen: isTerminalOpen } = useTerminal();

  return (
    <footer className="ide-statusbar">
      <div className="ide-statusbar-left">
        {/* Workspace directory */}
        <div className="ide-statusbar-item" title="Current Workspace Root">
          <Folder size={12} style={{ color: 'var(--red-primary)' }} />
          <span>{currentWorkspace ? currentWorkspace.name : 'No Workspace'}</span>
        </div>

        {/* Current active file */}
        {activeFile && (
          <div className="ide-statusbar-item">
            <FileCode size={12} />
            <span>{activeFile.path}</span>
          </div>
        )}

        {/* Cursor position */}
        {activeFile && (
          <div className="ide-statusbar-item">
            <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
          </div>
        )}
      </div>

      <div className="ide-statusbar-right">
        {/* File encoding and language */}
        {activeFile && (
          <>
            <div className="ide-statusbar-item">
              <span>UTF-8</span>
            </div>
            <div className="ide-statusbar-item" style={{ textTransform: 'uppercase' }}>
              <span>{activeFile.language}</span>
            </div>
          </>
        )}

        {/* Terminal state */}
        <div className="ide-statusbar-item" title="Active Terminal Sessions">
          <Terminal size={12} style={{ color: isTerminalOpen ? 'var(--status-online)' : 'var(--text-dim)' }} />
          <span>{tabs.length} PTY {tabs.length === 1 ? 'Tab' : 'Tabs'}</span>
        </div>

        {/* Execution environment info */}
        <div className="ide-statusbar-item" title="Execution Environment: Isolated PTY Sandbox">
          <Shield size={12} style={{ color: 'var(--status-online)' }} />
          <span>Linux Bash PTY</span>
        </div>

        <div className="ide-statusbar-item" title="Connection: Synchronized">
          <CheckCircle2 size={12} style={{ color: 'var(--status-online)' }} />
          <span>Live Sync</span>
        </div>
      </div>
    </footer>
  );
};
