import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { api } from '../../api/client';
import { useWorkspace } from '../../context/WorkspaceContext';

interface TerminalViewProps {
  sessionId: string;
  isActive: boolean;
  clearTrigger: number;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ sessionId, isActive, clearTrigger }) => {
  const { currentWorkspace } = useWorkspace();
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !currentWorkspace) return;

    // Initialize xterm instance with Neon Purple Cyberdark styling
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: '#000000',
        foreground: '#f3e8ff',
        cursor: '#b026ff',
        cursorAccent: '#000000',
        selectionBackground: 'rgba(176, 38, 255, 0.35)',
        black: '#100a1c',
        red: '#f43f5e',
        green: '#00ff88',
        yellow: '#facc15',
        blue: '#818cf8',
        magenta: '#b026ff',
        cyan: '#00f5ff',
        white: '#f5f3ff',
        brightBlack: '#6b5887',
        brightRed: '#fb7185',
        brightGreen: '#4ade80',
        brightYellow: '#fef08a',
        brightBlue: '#a5b4fc',
        brightMagenta: '#d946ef',
        brightCyan: '#38bdf8',
        brightWhite: '#ffffff',
      },
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    termInstanceRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = api.getToken();
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token || ''}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      // Send terminal initialization
      ws.send(
        JSON.stringify({
          type: 'terminal_init',
          sessionId,
          workspaceId: currentWorkspace.id,
          cols: term.cols,
          rows: term.rows,
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.sessionId === sessionId) {
          if (msg.type === 'terminal_output') {
            term.write(msg.data);
          } else if (msg.type === 'terminal_exit') {
            term.write(`\r\n\x1b[35m[Session completed with exit code ${msg.code}]\x1b[0m\r\n`);
          }
        }
      } catch {
        term.write(event.data);
      }
    };

    // Forward terminal keyboard input directly to PTY
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'terminal_input',
            sessionId,
            data,
          })
        );
      }
    });

    // Auto-fit function that syncs cols and rows to backend PTY
    const handleFit = () => {
      if (terminalRef.current && terminalRef.current.offsetParent !== null) {
        try {
          fitAddon.fit();
          if (ws.readyState === WebSocket.OPEN && term.cols && term.rows) {
            ws.send(
              JSON.stringify({
                type: 'terminal_resize',
                sessionId,
                cols: term.cols,
                rows: term.rows,
              })
            );
          }
        } catch {}
      }
    };

    // Use ResizeObserver to detect panel splitter drag immediately
    let rAF: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(handleFit);
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    window.addEventListener('resize', handleFit);
    setTimeout(handleFit, 100);

    return () => {
      cancelAnimationFrame(rAF);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleFit);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'terminal_close', sessionId }));
        ws.close();
      }
      term.dispose();
    };
  }, [sessionId, currentWorkspace]);

  // Refit when tab becomes active
  useEffect(() => {
    if (isActive && fitAddonRef.current && termInstanceRef.current && socketRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          const term = termInstanceRef.current;
          if (term && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({
                type: 'terminal_resize',
                sessionId,
                cols: term.cols,
                rows: term.rows,
              })
            );
          }
        } catch {}
      }, 50);
    }
  }, [isActive, sessionId]);

  // Handle clear trigger
  useEffect(() => {
    if (clearTrigger > 0 && isActive && termInstanceRef.current) {
      termInstanceRef.current.clear();
    }
  }, [clearTrigger, isActive]);

  return (
    <div
      ref={terminalRef}
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'block' : 'none',
        backgroundColor: '#000000',
        overflow: 'hidden',
      }}
    />
  );
};
