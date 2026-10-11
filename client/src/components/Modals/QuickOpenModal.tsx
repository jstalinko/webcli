import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useFile } from '../../context/FileContext';
import { api } from '../../api/client';
import { FileCode } from 'lucide-react';

interface QuickOpenModalProps {
  onClose: () => void;
}

export const QuickOpenModal: React.FC<QuickOpenModalProps> = ({ onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const { openFile } = useFile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ path: string; name: string; isDirectory: boolean }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!currentWorkspace) return;
    const search = async () => {
      try {
        const res = await api.searchFiles(currentWorkspace.id, query);
        setResults(res.results.filter((r) => !r.isDirectory));
        setSelectedIndex(0);
      } catch (err) {
        console.error('Quick open search failed:', err);
      }
    };

    const timer = setTimeout(search, 80);
    return () => clearTimeout(timer);
  }, [query, currentWorkspace]);

  const handleSelect = (filePath: string) => {
    openFile(filePath);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex].path);
      }
    }
  };

  return (
    <div className="ide-modal-backdrop" onClick={onClose}>
      <div
        className="ide-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', top: '15%', position: 'absolute' }}
      >
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            className="ide-quick-open-input"
            placeholder="Type a file name to open..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="ide-quick-open-list">
          {results.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
              {query ? 'No matching files found' : 'Start typing to search files...'}
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.path}
                className={`ide-quick-open-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item.path)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={14} style={{ color: 'var(--red-primary)' }} />
                  <span style={{ fontWeight: 600, color: '#fff' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{item.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
