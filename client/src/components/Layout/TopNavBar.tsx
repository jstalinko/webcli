import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useFile } from '../../context/FileContext';
import { useTerminal } from '../../context/TerminalContext';
import {
  ChevronDown,
  LogOut,
  FolderPlus,
  FilePlus,
  Save,
  X,
  Terminal,
  Columns,
  Maximize2,
  HelpCircle,
  Plus,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';

interface TopNavBarProps {
  onOpenShortcuts: () => void;
  onOpenQuickOpen: () => void;
  onOpenNewWorkspace: () => void;
  onOpenAbout: () => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  onOpenShortcuts,
  onOpenQuickOpen,
  onOpenNewWorkspace,
  onOpenAbout,
  toggleSidebar,
  isSidebarOpen,
}) => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, selectWorkspace } = useWorkspace();
  const { saveFile, closeFile, closeAllFiles, activeFilePath, createFile, createFolder, showHidden, setShowHidden } = useFile();
  const { addTab, clearActiveTerminal, toggleOpen, isOpen: isTerminalOpen, toggleFullscreen } = useTerminal();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
        setWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleNewFile = () => {
    const filename = prompt('Enter new file name:');
    if (filename && filename.trim()) {
      createFile(filename.trim());
    }
    setActiveMenu(null);
  };

  const handleNewFolder = () => {
    const folderName = prompt('Enter new folder name:');
    if (folderName && folderName.trim()) {
      createFolder(folderName.trim());
    }
    setActiveMenu(null);
  };

  return (
    <header className="ide-topbar" ref={navRef}>
      <div className="ide-topbar-left">
        {/* Brand Logo */}
        <div className="ide-logo">
          <span className="bracket">[</span>
          <span style={{ color: '#fff' }}>/</span>
          <span className="bracket">]</span>
          <span style={{ marginLeft: '4px' }}>WEBCLI</span>
        </div>

        {/* Workspace Selector */}
        <div style={{ position: 'relative' }}>
          <button
            className="ide-workspace-selector"
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
          >
            <span>{currentWorkspace ? currentWorkspace.name : 'Select Workspace'}</span>
            <ChevronDown size={13} style={{ color: 'var(--red-primary)' }} />
          </button>

          {workspaceMenuOpen && (
            <div className="ide-dropdown" style={{ minWidth: '220px' }}>
              <div style={{ padding: '4px 12px', fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Your Workspaces
              </div>
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  className="ide-dropdown-item"
                  onClick={() => {
                    selectWorkspace(ws.id);
                    setWorkspaceMenuOpen(false);
                  }}
                  style={{
                    color: currentWorkspace?.id === ws.id ? 'var(--red-primary)' : 'inherit',
                    fontWeight: currentWorkspace?.id === ws.id ? 700 : 400,
                  }}
                >
                  <span>{ws.name}</span>
                  {currentWorkspace?.id === ws.id && <span style={{ fontSize: '0.65rem' }}>ACTIVE</span>}
                </button>
              ))}
              <div className="ide-dropdown-divider" />
              <button
                className="ide-dropdown-item"
                onClick={() => {
                  setWorkspaceMenuOpen(false);
                  onOpenNewWorkspace();
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={13} style={{ color: 'var(--red-primary)' }} />
                  Create New Workspace
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Top Dropdown Menus */}
        <nav className="ide-menus">
          {/* File Menu */}
          <div className="ide-menu-item">
            <button
              className={`ide-menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
              onClick={() => handleMenuClick('file')}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="ide-dropdown">
                <button className="ide-dropdown-item" onClick={handleNewFile}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FilePlus size={13} /> New File
                  </span>
                </button>
                <button className="ide-dropdown-item" onClick={handleNewFolder}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FolderPlus size={13} /> New Folder
                  </span>
                </button>
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    onOpenQuickOpen();
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Search size={13} /> Quick Open File
                  </span>
                  <span className="shortcut">Ctrl+P</span>
                </button>
                <div className="ide-dropdown-divider" />
                <button
                  className="ide-dropdown-item"
                  disabled={!activeFilePath}
                  onClick={() => {
                    if (activeFilePath) saveFile(activeFilePath);
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Save size={13} /> Save Active File
                  </span>
                  <span className="shortcut">Ctrl+S</span>
                </button>
                <button
                  className="ide-dropdown-item"
                  disabled={!activeFilePath}
                  onClick={() => {
                    if (activeFilePath) closeFile(activeFilePath);
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <X size={13} /> Close Tab
                  </span>
                  <span className="shortcut">Ctrl+W</span>
                </button>
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    closeAllFiles();
                    setActiveMenu(null);
                  }}
                >
                  <span>Close All Tabs</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="ide-menu-item">
            <button
              className={`ide-menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => handleMenuClick('view')}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="ide-dropdown">
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    toggleSidebar();
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Columns size={13} /> {isSidebarOpen ? 'Hide File Explorer' : 'Show File Explorer'}
                  </span>
                </button>
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    toggleOpen();
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Terminal size={13} /> {isTerminalOpen ? 'Hide Terminal Panel' : 'Show Terminal Panel'}
                  </span>
                  <span className="shortcut">Ctrl+`</span>
                </button>
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    toggleFullscreen();
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Maximize2 size={13} /> Fullscreen Terminal
                  </span>
                </button>
                <div className="ide-dropdown-divider" />
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    setShowHidden((prev) => !prev);
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {showHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showHidden ? 'Hide Dotfiles' : 'Show Dotfiles'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Terminal Menu */}
          <div className="ide-menu-item">
            <button
              className={`ide-menu-btn ${activeMenu === 'terminal' ? 'active' : ''}`}
              onClick={() => handleMenuClick('terminal')}
            >
              Terminal
            </button>
            {activeMenu === 'terminal' && (
              <div className="ide-dropdown">
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    addTab();
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={13} /> New Terminal Tab
                  </span>
                  <span className="shortcut">Ctrl+Shift+T</span>
                </button>
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    clearActiveTerminal();
                    setActiveMenu(null);
                  }}
                >
                  <span>Clear Terminal Screen</span>
                  <span className="shortcut">Ctrl+L</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="ide-menu-item">
            <button
              className={`ide-menu-btn ${activeMenu === 'help' ? 'active' : ''}`}
              onClick={() => handleMenuClick('help')}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div className="ide-dropdown">
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    onOpenShortcuts();
                    setActiveMenu(null);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={13} /> Keyboard Shortcuts
                  </span>
                </button>
                <button
                  className="ide-dropdown-item"
                  onClick={() => {
                    onOpenAbout();
                    setActiveMenu(null);
                  }}
                >
                  <span>About WEBCLI &amp; Linux Core</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="ide-topbar-right">
        {/* Status indicator */}
        <div className="ide-status-pill">
          <span className="status-dot online"></span>
          <span>ONLINE</span>
        </div>

        {/* User profile and logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
              }}
            >
              {user.username}
            </span>
            <button className="cyber-logout-btn" onClick={logout} title="Sign Out">
              <LogOut size={13} />
              <span className="logout-label">EXIT</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
