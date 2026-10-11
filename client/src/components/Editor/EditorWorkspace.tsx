import React, { useRef, useEffect } from 'react';
import Editor, { loader, type Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useFile } from '../../context/FileContext';
import { EditorTabs } from './EditorTabs';
import { Save, Check, FileCode, Terminal } from 'lucide-react';

loader.config({ monaco });

interface EditorWorkspaceProps {
  onCursorChange: (pos: { lineNumber: number; column: number }) => void;
  onOpenQuickOpen: () => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ onCursorChange, onOpenQuickOpen }) => {
  const { activeFile, updateFileContent, saveFile } = useFile();
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Setup custom Purple Neon Cyberdark Theme in Monaco
  const handleEditorWillMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('cyber-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b5887', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
        { token: 'string', foreground: '4ade80' },
        { token: 'number', foreground: 'f472b6' },
        { token: 'type', foreground: '38bdf8' },
        { token: 'identifier', foreground: 'f5f3ff' },
      ],
      colors: {
        'editor.background': '#07040f',
        'editor.foreground': '#f3e8ff',
        'editorCursor.foreground': '#b026ff',
        'editor.lineHighlightBackground': '#b026ff14',
        'editorLineNumber.foreground': '#584473',
        'editorLineNumber.activeForeground': '#b026ff',
        'editor.selectionBackground': '#b026ff59',
        'editor.inactiveSelectionBackground': '#b026ff2e',
        'editor.selectionHighlightBackground': '#b026ff33',
        'editor.wordHighlightBackground': '#b026ff33',
        'editor.wordHighlightStrongBackground': '#b026ff55',
        'editor.findMatchHighlightBackground': '#b026ff66',
      },
    });
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // Trigger initial layout
    requestAnimationFrame(() => {
      editor.layout();
    });

    // Track cursor movement for status bar
    editor.onDidChangeCursorPosition((e: any) => {
      onCursorChange({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // Custom keybinding for Ctrl+S / Cmd+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFile) {
        saveFile(activeFile.path);
      }
    });

    // Custom keybinding for Ctrl+P / Cmd+P
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      onOpenQuickOpen();
    });
  };

  // ResizeObserver on editor container to guarantee Monaco re-lays out on splitter drag
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcut listener for Ctrl+S when outside editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) {
          saveFile(activeFile.path);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, saveFile]);

  // Keep editor content in sync when activeFile changes
  useEffect(() => {
    if (editorRef.current && activeFile) {
      const currentVal = editorRef.current.getValue();
      if (currentVal !== activeFile.content) {
        editorRef.current.setValue(activeFile.content);
      }
      editorRef.current.layout();
    }
  }, [activeFile?.path]);

  const canonicalPath = activeFile
    ? activeFile.path.startsWith('/')
      ? activeFile.path
      : `/${activeFile.path}`
    : '';

  return (
    <div className="ide-editor-container">
      {/* Tabs */}
      <EditorTabs />

      {activeFile ? (
        <>
          {/* Breadcrumb path toolbar */}
          <div className="ide-editor-breadcrumbs">
            <div className="ide-editor-breadcrumbs-path">
              <FileCode size={13} style={{ color: 'var(--purple-primary)' }} />
              <span>{activeFile.path}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {activeFile.language}
              </span>
              <button
                onClick={() => saveFile(activeFile.path)}
                disabled={!activeFile.isDirty}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: activeFile.isDirty ? 'rgba(176, 38, 255, 0.25)' : 'transparent',
                  border: `1px solid ${activeFile.isDirty ? 'var(--purple-primary)' : 'rgba(255,255,255,0.1)'}`,
                  color: activeFile.isDirty ? '#ffffff' : 'var(--text-dim)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  cursor: activeFile.isDirty ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
              >
                {activeFile.isDirty ? <Save size={11} /> : <Check size={11} />}
                <span>{activeFile.isDirty ? 'Save (Ctrl+S)' : 'Saved'}</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className="ide-editor-content" ref={containerRef}>
            <Editor
              height="100%"
              path={canonicalPath}
              language={activeFile.language}
              value={activeFile.content}
              theme="cyber-dark"
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              onChange={(value) => updateFileContent(activeFile.path, value || '')}
              options={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 13,
                lineHeight: 20,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        </>
      ) : (
        /* Empty Workspace State */
        <div className="ide-editor-empty">
          <div className="cyber-bracket-logo">[ / ]</div>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', letterSpacing: '0.05em' }}>WEBCLI CODE EDITOR</h2>
          <p style={{ maxWidth: '380px', textAlign: 'center', fontSize: '0.8rem', lineHeight: '1.5' }}>
            Select a file from the explorer on the left or press <kbd style={{ background: '#222', padding: '2px 6px', borderRadius: '4px' }}>Ctrl+P</kbd> to quick open.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              className="cyber-nav-back-btn"
              onClick={onOpenQuickOpen}
              style={{ cursor: 'pointer' }}
            >
              <Terminal size={13} />
              <span>Quick Open (Ctrl+P)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
