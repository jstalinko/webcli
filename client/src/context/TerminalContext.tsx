import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { TerminalTabInfo } from '../types';
import { useWorkspace } from './WorkspaceContext';

interface TerminalContextType {
  tabs: TerminalTabInfo[];
  activeTabId: string | null;
  isOpen: boolean;
  isFullscreen: boolean;
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTabId: (id: string) => void;
  toggleOpen: () => void;
  toggleFullscreen: () => void;
  clearActiveTerminal: () => void;
  clearEmitter: number; // incremented to trigger clear on active terminal
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentWorkspace } = useWorkspace();
  const [tabs, setTabs] = useState<TerminalTabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clearEmitter, setClearEmitter] = useState(0);

  // Initialize first terminal tab when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      const initialId = `term_${Date.now()}_1`;
      setTabs([{ id: initialId, title: 'bash (1)', ready: true }]);
      setActiveTabId(initialId);
    } else {
      setTabs([]);
      setActiveTabId(null);
    }
  }, [currentWorkspace]);

  const addTab = useCallback(() => {
    const newId = `term_${Date.now()}_${tabs.length + 1}`;
    const newTab: TerminalTabInfo = {
      id: newId,
      title: `bash (${tabs.length + 1})`,
      ready: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setIsOpen(true);
  }, [tabs.length]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const nextActive = filtered[filtered.length - 1] || null;
        setActiveTabId(nextActive ? nextActive.id : null);
      }
      return filtered;
    });
  }, [activeTabId]);

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);
  const clearActiveTerminal = () => setClearEmitter((prev) => prev + 1);

  return (
    <TerminalContext.Provider
      value={{
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
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (!context) throw new Error('useTerminal must be used within a TerminalProvider');
  return context;
};
