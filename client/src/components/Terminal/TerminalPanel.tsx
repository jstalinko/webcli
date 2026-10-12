import React from 'react';
import { useTerminal } from '../../context/TerminalContext';
import { TerminalView } from './TerminalView';
import { Plus, X, Maximize2, Minimize2, Trash2, Terminal } from 'lucide-react';

export const TerminalPanel: React.FC = () => {
  const {
    tabs,
    activeTabId,
    isOpen,
    isFullscreen,
    addTab,
    closeTab,
    setActiveTabId,
    toggleOpen,
    toggleFullscreen,
    clearActiveTerminal,
    clearEmitter,
  } = useTerminal();

  if (!isOpen) return null;

  return (
    <div className={`ide-terminal-panel ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Terminal Header */}
      <div className="ide-terminal-header">
        <div className="ide-terminal-tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className={`ide-terminal-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <Terminal size={12} style={{ color: isActive ? 'var(--red-primary)' : 'var(--text-dim)' }} />
                <span>{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    className="ide-tab-close-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    title="Close session"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Tab Button */}
          <button className="ide-terminal-add-btn" onClick={addTab} title="New Terminal (Ctrl+Shift+T)">
            <Plus size={13} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="ide-terminal-actions">
          <button
            className="ide-icon-btn"
            onClick={clearActiveTerminal}
            title="Clear Terminal Screen (Ctrl+L)"
          >
            <Trash2 size={13} />
          </button>
          <button
            className="ide-icon-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Restore Terminal Size' : 'Maximize Terminal'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            className="ide-icon-btn"
            onClick={toggleOpen}
            title="Close Terminal Panel (Ctrl+`)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="ide-terminal-body">
        {tabs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '12px',
              color: 'var(--text-dim)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <p>No active terminal sessions.</p>
            <button className="cyber-nav-back-btn" onClick={addTab} style={{ cursor: 'pointer' }}>
              <Plus size={13} /> Launch Linux Terminal
            </button>
          </div>
        ) : (
          tabs.map((tab) => (
            <TerminalView
              key={tab.id}
              sessionId={tab.id}
              title={tab.title}
              isActive={tab.id === activeTabId}
              clearTrigger={clearEmitter}
            />
          ))
        )}
      </div>
    </div>
  );
};
