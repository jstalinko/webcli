import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { FileProvider, useFile } from './context/FileContext';
import { TerminalProvider, useTerminal } from './context/TerminalContext';
import { AuthPage } from './components/Auth/AuthPage';
import { TopNavBar } from './components/Layout/TopNavBar';
import { StatusBar } from './components/Layout/StatusBar';
import { FileTree } from './components/FileExplorer/FileTree';
import { EditorWorkspace } from './components/Editor/EditorWorkspace';
import { TerminalPanel } from './components/Terminal/TerminalPanel';
import { KeyboardShortcutsModal } from './components/Modals/KeyboardShortcutsModal';
import { QuickOpenModal } from './components/Modals/QuickOpenModal';
import { NewWorkspaceModal } from './components/Modals/NewWorkspaceModal';
import { AboutModal } from './components/Modals/AboutModal';

const MainIDE: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { activeFilePath, saveFile, closeFile, refreshFiles } = useFile();
  const { isOpen: isTerminalOpen, toggleOpen: toggleTerminal, addTab: addTerminalTab } = useTerminal();

  // Layout sizing state with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('webcli_sidebar_width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [terminalHeight, setTerminalHeight] = useState(() => {
    const saved = localStorage.getItem('webcli_terminal_height');
    return saved ? parseInt(saved, 10) : 280;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modals state
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // Status bar cursor position state
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });

  // Dragging splitters references
  const isDraggingVertical = useRef(false);
  const isDraggingHorizontal = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Global mousemove/mouseup for smooth splitter resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingVertical.current) {
        const newWidth = Math.max(160, Math.min(e.clientX, 600));
        setSidebarWidth(newWidth);
        localStorage.setItem('webcli_sidebar_width', newWidth.toString());
      } else if (isDraggingHorizontal.current && bodyRef.current) {
        const bodyRect = bodyRef.current.getBoundingClientRect();
        const newHeight = Math.max(100, Math.min(bodyRect.bottom - e.clientY, bodyRect.height - 120));
        setTerminalHeight(newHeight);
        localStorage.setItem('webcli_terminal_height', newHeight.toString());
      }
    };

    const handleMouseUp = () => {
      isDraggingVertical.current = false;
      isDraggingHorizontal.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeFilePath) {
          saveFile(activeFilePath);
        }
      }
      // Ctrl+P / Cmd+P
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setShowQuickOpen((prev) => !prev);
      }
      // Ctrl+` (backtick) or Ctrl+~
      else if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        toggleTerminal();
      }
      // Ctrl+Shift+T
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        addTerminalTab();
      }
      // Ctrl+W: Close active tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        if (activeFilePath) {
          e.preventDefault();
          closeFile(activeFilePath);
        }
      }
      // F5: Refresh files
      else if (e.key === 'F5') {
        e.preventDefault();
        refreshFiles();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilePath, saveFile, closeFile, toggleTerminal, addTerminalTab, refreshFiles]);

  if (authLoading) {
    return (
      <div className="login-body">
        <div className="cyber-grid"></div>
        <div className="scanlines"></div>
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontSize: '2.5rem', color: 'var(--red-primary)', marginBottom: '16px' }}>[ / ]</div>
          <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em' }}>WEBCLI</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '6px' }}>Initializing environment...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="ide-root">
      {/* Top Application Bar */}
      <TopNavBar
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenQuickOpen={() => setShowQuickOpen(true)}
        onOpenNewWorkspace={() => setShowNewWorkspace(true)}
        onOpenAbout={() => setShowAbout(true)}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main IDE Body */}
      <div className="ide-body" ref={bodyRef}>
        {/* Left Sidebar: File Explorer */}
        {isSidebarOpen && (
          <div style={{ width: `${sidebarWidth}px`, height: '100%', flexShrink: 0 }}>
            <FileTree />
          </div>
        )}

        {/* Vertical Draggable Splitter */}
        {isSidebarOpen && (
          <div
            className="ide-splitter-vertical"
            onMouseDown={(e) => {
              e.preventDefault();
              isDraggingVertical.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            onDoubleClick={() => setIsSidebarOpen(false)}
            title="Drag to resize file tree. Double-click to collapse."
          />
        )}

        {/* Main Work Area: Code Editor (top) + Terminal (bottom) */}
        <div className="ide-main-area">
          {/* Upper Editor Workspace */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <EditorWorkspace
              onCursorChange={setCursorPosition}
              onOpenQuickOpen={() => setShowQuickOpen(true)}
            />
          </div>

          {/* Horizontal Draggable Splitter */}
          {isTerminalOpen && (
            <div
              className="ide-splitter-horizontal"
              onMouseDown={(e) => {
                e.preventDefault();
                isDraggingHorizontal.current = true;
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
              }}
              title="Drag to resize terminal panel."
            />
          )}

          {/* Lower Terminal Panel */}
          {isTerminalOpen && (
            <div
              style={{
                height: `${terminalHeight}px`,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <TerminalPanel />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar cursorPosition={cursorPosition} />

      {/* Modals */}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showQuickOpen && <QuickOpenModal onClose={() => setShowQuickOpen(false)} />}
      {showNewWorkspace && <NewWorkspaceModal onClose={() => setShowNewWorkspace(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <FileProvider>
          <TerminalProvider>
            <MainIDE />
          </TerminalProvider>
        </FileProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
