import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { X, FolderPlus } from 'lucide-react';

interface NewWorkspaceModalProps {
  onClose: () => void;
}

export const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({ onClose }) => {
  const { createWorkspace } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      await createWorkspace(name.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ide-modal-backdrop" onClick={onClose}>
      <div className="ide-modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={18} style={{ color: 'var(--red-primary)' }} />
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: '#fff' }}>CREATE NEW WORKSPACE</h3>
          </div>
          <button className="ide-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--red-primary)', fontSize: '0.75rem', marginBottom: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">WORKSPACE NAME</label>
            <input
              type="text"
              className="cyber-input"
              placeholder="e.g. My-Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPTION (OPTIONAL)</label>
            <input
              type="text"
              className="cyber-input"
              placeholder="Brief summary of this environment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="cyber-nav-back-btn"
              onClick={onClose}
              style={{ cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cyber-submit-btn"
              disabled={isLoading}
              style={{ width: 'auto', padding: '8px 20px' }}
            >
              <span>{isLoading ? 'CREATING...' : 'INITIALIZE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
