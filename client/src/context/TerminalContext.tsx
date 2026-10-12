import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { TerminalTabInfo } from '../types';
import { api } from '../api/client';
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

  // Initialize and restore active terminal tabs when workspace changes
  useEffect(() => {
    if (!currentWorkspace) {
      setTabs([]);
      setActiveTabId(null);
      return;
    }

    let isMounted = true;

    const loadSessions = async () => {
      try {
        const { sessions } = await api.getTerminalSessions(currentWorkspace.id);
        if (!isMounted) return;

        if (sessions && sessions.length > 0) {
          const restoredTabs: TerminalTabInfo[] = sessions.map((s, idx) => ({
            id: s.id,
            title: s.title || `bash (${idx + 1})`,
            ready: true,
          }));
          setTabs(restoredTabs);

          const savedActiveId = localStorage.getItem(`webcli_active_term_${currentWorkspace.id}`);
          const found = restoredTabs.find((t) => t.id === savedActiveId);
          const targetId = found ? found.id : restoredTabs[0].id;
          setActiveTabId(targetId);
          localStorage.setItem(`webcli_active_term_${currentWorkspace.id}`, targetId);
        } else {
          const initialId = `term_${Date.now()}_1`;
          setTabs([{ id: initialId, title: 'bash (1)', ready: true }]);
          setActiveTabId(initialId);
          localStorage.setItem(`webcli_active_term_${currentWorkspace.id}`, initialId);
        }
      } catch (err) {
        console.error('Failed to restore active terminal sessions:', err);
        if (isMounted) {
          const initialId = `term_${Date.now()}_1`;
          setTabs([{ id: initialId, title: 'bash (1)', ready: true }]);
          setActiveTabId(initialId);
        }
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [currentWorkspace]);

  const handleSetActiveTabId = useCallback(
    (id: string) => {
      setActiveTabId(id);
      if (currentWorkspace && id) {
        localStorage.setItem(`webcli_active_term_${currentWorkspace.id}`, id);
      }
    },
    [currentWorkspace]
  );

  const addTab = useCallback(() => {
    const newId = `term_${Date.now()}_${tabs.length + 1}`;
    const newTab: TerminalTabInfo = {
      id: newId,
      title: `bash (${tabs.length + 1})`,
      ready: true,
    };
    setTabs((prev) => [...prev, newTab]);
    handleSetActiveTabId(newId);
    setIsOpen(true);
  }, [tabs.length, handleSetActiveTabId]);

  const closeTab = useCallback(
    async (id: string) => {
      if (currentWorkspace) {
        try {
          await api.deleteTerminalSession(currentWorkspace.id, id);
        } catch (err) {
          console.error(`Failed to close terminal session ${id}:`, err);
        }
      }
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (activeTabId === id) {
          const nextActive = filtered[filtered.length - 1] || null;
          handleSetActiveTabId(nextActive ? nextActive.id : '');
        }
        return filtered;
      });
    },
    [activeTabId, currentWorkspace, handleSetActiveTabId]
  );

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
