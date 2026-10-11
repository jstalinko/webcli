import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Terminal, Shield, LogIn, AlertCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="cyber-grid"></div>
      <div className="scanlines"></div>
      <div className="login-wrapper">
        <div className="login-card-container">
          {/* Cyber Corner Accents */}
          <div className="cyber-corner top-left"></div>
          <div className="cyber-corner top-right"></div>
          <div className="cyber-corner bottom-left"></div>
          <div className="cyber-corner bottom-right"></div>

          <div className="login-header">
            <div className="login-logo-badge">
              <span className="logo-bracket">[</span>
              <span className="logo-symbol">/</span>
              <span className="logo-bracket">]</span>
            </div>
            <h1 className="login-title">WEBCLI</h1>
            <p className="login-subtitle">Cloud Development Environment &amp; Terminal</p>

            <div className="terminal-status-pill">
              <span className="pulse-dot"></span>
              <span>NODE-PTY / BASH CORE ONLINE</span>
            </div>
          </div>

          {error && (
            <div className="cyber-alert">
              <AlertCircle className="cyber-alert-icon" size={20} />
              <div className="cyber-alert-content">
                <span className="cyber-alert-title">SECURITY EXCEPTION</span>
                <span className="cyber-alert-msg">{error}</span>
              </div>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <Terminal size={14} />
                <span>USERNAME</span>
              </label>
              <div className="input-container">
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Shield size={14} />
                <span>PASSPHRASE</span>
              </label>
              <div className="input-container">
                <input
                  type="password"
                  className="cyber-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="cyber-submit-btn" disabled={isLoading}>
              {isLoading ? (
                <span>AUTHENTICATING...</span>
              ) : (
                <>
                  <span>AUTHENTICATE SESSION</span>
                  <LogIn className="btn-icon" size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Registration via web interface is disabled.
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Use <code style={{ color: 'var(--purple-primary)', background: 'rgba(176,38,255,0.12)', padding: '2px 6px', borderRadius: '4px' }}>./webcli.sh</code> to manage or create accounts.
            </p>
          </div>

          <div className="login-footer">
            <div className="footer-meta">
              <span className="meta-item">
                <i>✦</i> HOST: LINUX-X64
              </span>
              <span>/</span>
              <span className="meta-item">
                <i>✦</i> ISOLATION: WORKSPACE ROOT
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
