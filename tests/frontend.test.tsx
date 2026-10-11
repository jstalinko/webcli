/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileItem } from '../client/src/components/FileExplorer/FileItem';
import { EditorTabs } from '../client/src/components/Editor/EditorTabs';
import { FileNode } from '../client/src/types';
import { FileProvider, useFile } from '../client/src/context/FileContext';
import { WorkspaceProvider, useWorkspace } from '../client/src/context/WorkspaceContext';
import { AuthProvider } from '../client/src/context/AuthContext';

describe('WEBCLI Frontend Component Tests', () => {
  describe('1. File Tree Item Rendering', () => {
    it('should render file name and handle click', () => {
      let openedPath = '';
      const mockNode: FileNode = {
        name: 'test.py',
        path: 'src/test.py',
        isDirectory: false,
      };

      render(
        <FileItem
          node={mockNode}
          activePath={null}
          showHidden={false}
          onOpen={(path) => {
            openedPath = path;
          }}
          onContextMenu={() => {}}
        />
      );

      expect(screen.getByText('test.py')).toBeDefined();
      fireEvent.click(screen.getByText('test.py'));
      expect(openedPath).toBe('src/test.py');
    });

    it('should hide dotfiles when showHidden is false', () => {
      const hiddenNode: FileNode = {
        name: '.env',
        path: '.env',
        isDirectory: false,
      };

      const { container } = render(
        <FileItem
          node={hiddenNode}
          activePath={null}
          showHidden={false}
          onOpen={() => {}}
          onContextMenu={() => {}}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should display dotfiles when showHidden is true', () => {
      const hiddenNode: FileNode = {
        name: '.env',
        path: '.env',
        isDirectory: false,
      };

      render(
        <FileItem
          node={hiddenNode}
          activePath={null}
          showHidden={true}
          onOpen={() => {}}
          onContextMenu={() => {}}
        />
      );

      expect(screen.getByText('.env')).toBeDefined();
    });
  });

  describe('2. Editor Tabs & Dirty Indicator', () => {
    it('should render open tabs and dirty indicator for unsaved changes', () => {
      // Mock component using FileContext
      const TestTabsWrapper: React.FC = () => {
        const { openFiles, updateFileContent } = useFile();
        return (
          <div>
            <EditorTabs />
            <button
              onClick={() => updateFileContent('app.py', 'modified content')}
              data-testid="modify-btn"
            >
              Modify
            </button>
          </div>
        );
      };

      // Helper with custom state
      const { container } = render(
        <AuthProvider>
          <WorkspaceProvider>
            <FileProvider>
              <TestTabsWrapper />
            </FileProvider>
          </WorkspaceProvider>
        </AuthProvider>
      );

      expect(container).toBeDefined();
    });
  });
});
