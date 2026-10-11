export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  user_id: string;
  root_path: string;
  created_at: string;
  updated_at: string;
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
  children?: FileNode[];
}

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  language: string;
}

export interface TerminalTabInfo {
  id: string;
  title: string;
  ready: boolean;
}
