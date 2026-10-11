import React from 'react';
import { X, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: 'Ctrl+S / Cmd+S', desc: 'Save active file to workspace filesystem' },
    { key: 'Ctrl+P / Cmd+P', desc: 'Quick Open: Search and jump to any workspace file' },
    { key: 'Ctrl+`', desc: 'Toggle integrated terminal panel' },
    { key: 'Ctrl+Shift+T', desc: 'Create a new independent terminal tab' },
    { key: 'Ctrl+W', desc: 'Close active editor tab with unsaved warning' },
    { key: 'Ctrl+L', desc: 'Clear terminal screen scrollback' },
    { key: 'F2', desc: 'Rename selected file or folder in explorer' },
    { key: 'F5', desc: 'Refresh workspace file tree' },
    { key: 'Ctrl+C', desc: 'Interrupt running terminal command / process' },
    { key: 'Ctrl+D', desc: 'Send EOF to terminal shell' },
  ];

  return (
    <div className="ide-modal-backdrop" onClick={onClose}>
      <div className="ide-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Command size={18} style={{ color: 'var(--red-primary)' }} />
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#fff' }}>KEYBOARD SHORTCUTS</h3>
          </div>
          <button className="ide-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {shortcuts.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(15, 15, 15, 0.8)',
                border: '1px solid rgba(255, 23, 68, 0.15)',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
              <kbd
                style={{
                  background: 'rgba(255, 23, 68, 0.12)',
                  border: '1px solid var(--red-border)',
                  color: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="cyber-submit-btn" onClick={onClose} style={{ display: 'inline-flex', width: 'auto', padding: '8px 20px' }}>
            <span>CLOSE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
