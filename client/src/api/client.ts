import type { User, Workspace, FileNode } from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('webcli_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('webcli_token', token);
    } else {
      localStorage.removeItem('webcli_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errorData = await res.json();
        errorMsg = errorData.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Auth Endpoints
  async register(username: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Workspace Endpoints
  async getWorkspaces(): Promise<{ workspaces: Workspace[] }> {
    return this.request<{ workspaces: Workspace[] }>('/workspaces');
  }

  async createWorkspace(name: string, description: string = ''): Promise<{ workspace: Workspace }> {
    return this.request<{ workspace: Workspace }>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteWorkspace(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  }

  // Filesystem Endpoints
  async getFileTree(workspaceId: string, path: string = ''): Promise<{ files: FileNode[] }> {
    return this.request<{ files: FileNode[] }>(`/workspaces/${workspaceId}/files?path=${encodeURIComponent(path)}`);
  }

  async readFile(workspaceId: string, path: string): Promise<{ content: string; size: number; isBinary: boolean }> {
    return this.request<{ content: string; size: number; isBinary: boolean }>(
      `/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`
    );
  }

  async writeFile(workspaceId: string, path: string, content: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/file`, {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    });
  }

  async createFile(workspaceId: string, path: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/file`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async createFolder(workspaceId: string, path: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/folder`, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async renameItem(workspaceId: string, oldPath: string, newPath: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/rename`, {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath }),
    });
  }

  async deleteItem(workspaceId: string, path: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workspaces/${workspaceId}/file?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
  }

  async searchFiles(workspaceId: string, query: string): Promise<{ results: { path: string; name: string; isDirectory: boolean }[] }> {
    return this.request<{ results: { path: string; name: string; isDirectory: boolean }[] }>(
      `/workspaces/${workspaceId}/search?query=${encodeURIComponent(query)}`
    );
  }

  async uploadFile(workspaceId: string, targetDir: string, file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetDir', targetDir);

    return this.request<{ message: string }>(`/workspaces/${workspaceId}/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  getDownloadUrl(workspaceId: string, filePath: string): string {
    return `${API_BASE}/workspaces/${workspaceId}/download?path=${encodeURIComponent(filePath)}&token=${this.token || ''}`;
  }

  // Terminal Endpoints
  async getTerminalSessions(workspaceId: string): Promise<{ sessions: { id: string; title: string; createdAt: string }[] }> {
    return this.request<{ sessions: { id: string; title: string; createdAt: string }[] }>(
      `/workspaces/${workspaceId}/terminals`
    );
  }

  async createTerminalSession(workspaceId: string): Promise<{ sessionId: string }> {
    return this.request<{ sessionId: string }>(`/workspaces/${workspaceId}/terminals`, {
      method: 'POST',
    });
  }

  async deleteTerminalSession(workspaceId: string, sessionId: string): Promise<{ closed: boolean; sessionId: string }> {
    return this.request<{ closed: boolean; sessionId: string }>(
      `/workspaces/${workspaceId}/terminals/${sessionId}`,
      { method: 'DELETE' }
    );
  }
}

export const api = new ApiClient();
