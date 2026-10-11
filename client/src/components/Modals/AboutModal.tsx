import React from 'react';
import { X, Shield, Terminal, Code2, Server } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="ide-modal-backdrop" onClick={onClose}>
      <div className="ide-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--red-primary)', fontWeight: 700 }}>
              [ / ]
            </span>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#fff' }}>
              ABOUT WEBCLI
            </h3>
          </div>
          <button className="ide-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.82rem', lineHeight: '1.6', color: '#d0d0d0' }}>
          <p>
            <strong>WEBCLI</strong> is a high-performance cloud development environment combining a real interactive Linux shell, Monaco code editor, and live filesystem workspace.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(12, 12, 12, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-primary)', marginBottom: '4px', fontWeight: 600 }}>
                <Terminal size={14} /> Real Linux PTY
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Powered by <code>node-pty</code> and <code>xterm.js</code> over WebSockets. Supports interactive bash, vim, nano, htop, and standard Linux processes.
              </p>
            </div>

            <div style={{ background: 'rgba(12, 12, 12, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-primary)', marginBottom: '4px', fontWeight: 600 }}>
                <Code2 size={14} /> Monaco Code Editor
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Full-featured editor engine with syntax highlighting, tabs, dirty state management, and seamless Ctrl+S disk synchronization.
              </p>
            </div>

            <div style={{ background: 'rgba(12, 12, 12, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-primary)', marginBottom: '4px', fontWeight: 600 }}>
                <Shield size={14} /> Security &amp; Sudo
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Guaranteed workspace root isolation. Path traversal and symlink escape checks on every API operation. Transparent sudo password prompt pass-through via PTY.
              </p>
            </div>

            <div style={{ background: 'rgba(12, 12, 12, 0.8)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-primary)', marginBottom: '4px', fontWeight: 600 }}>
                <Server size={14} /> Live Synchronization
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                Filesystem events created in the terminal (e.g. <code>touch</code>, <code>mkdir</code>) immediately synchronize live with the UI tree without page reloads.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Architecture: Node.js 20 / Express / WebSocket / React 19 / Monaco / XTerm.js / SQLite WAL.
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="cyber-submit-btn" onClick={onClose} style={{ display: 'inline-flex', width: 'auto', padding: '8px 22px' }}>
            <span>ACKNOWLEDGE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
