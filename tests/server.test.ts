import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../server/src/index.js';
import { db } from '../server/src/db.js';
import { CONFIG } from '../server/src/config.js';
import { resolveSafeWorkspacePath, SecurityError } from '../server/src/security.js';
import { PtyService } from '../server/src/services/pty.service.js';

describe('WEBCLI Backend Integration Test Suite', () => {
  let user1Token: string;
  let user1Id: string;
  let user1WorkspaceId: string;
  let user1WorkspaceRoot: string;

  let user2Token: string;
  let user2Id: string;

  beforeAll(async () => {
    // Ensure test directories exist
    fs.mkdirSync(CONFIG.WORKSPACES_ROOT, { recursive: true });
  });

  afterAll(() => {
    // Clean up
    PtyService.closeAllWorkspaceSessions(user1WorkspaceId);
  });

  describe('1. Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('2. Authentication System', () => {
    it('should register a new user and auto-create default workspace', async () => {
      const username = `alice_${Date.now()}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username,
          email: `${username}@cyberlab.local`,
          password: 'SecretPassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(username);
      expect(res.body.token).toBeDefined();

      user1Token = res.body.token;
      user1Id = res.body.user.id;
    });

    it('should reject registration with duplicate username', async () => {
      const fixedUser = `alice_fixed_${Date.now()}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: fixedUser,
          email: `${fixedUser}_1@cyberlab.local`,
          password: 'SecretPassword123!',
        });
      expect(res.status).toBe(201);

      const duplicate = await request(app)
        .post('/api/auth/register')
        .send({
          username: fixedUser,
          email: `${fixedUser}_2@cyberlab.local`,
          password: 'SecretPassword123!',
        });
      expect(duplicate.status).toBe(409);
    });

    it('should login with valid credentials', async () => {
      const loginUser = `alice_login_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          username: loginUser,
          email: `${loginUser}@cyberlab.local`,
          password: 'SecretPassword123!',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: loginUser,
          password: 'SecretPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe(loginUser);
    });

    it('should reject login with wrong password', async () => {
      const loginUser = `alice_login_wrong_${Date.now()}`;
      await request(app)
        .post('/api/auth/register')
        .send({
          username: loginUser,
          email: `${loginUser}@cyberlab.local`,
          password: 'SecretPassword123!',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: loginUser,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
    });

    it('should return profile for authenticated user on /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user1Id);
    });

    it('should reject unauthenticated request on /api/auth/me', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('3. Workspace Management & Authorization Isolation', () => {
    it('should register a second user for authorization boundary testing', async () => {
      const username = `bob_${Date.now()}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username,
          email: `${username}@cyberlab.local`,
          password: 'BobPassword123!',
        });

      expect(res.status).toBe(201);
      user2Token = res.body.token;
      user2Id = res.body.user.id;
    });

    it('should list workspaces for user 1', async () => {
      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.workspaces.length).toBeGreaterThan(0);
      user1WorkspaceId = res.body.workspaces[0].id;
      user1WorkspaceRoot = res.body.workspaces[0].root_path;
    });

    it('should create a custom workspace for user 1', async () => {
      const res = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'NodeJS Cyber Project',
          description: 'A sandbox project for testing',
        });

      expect(res.status).toBe(201);
      expect(res.body.workspace.name).toBe('NodeJS Cyber Project');
    });

    it('should prevent User 2 from accessing User 1 workspace (Cross-tenant isolation)', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${user1WorkspaceId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('4. Filesystem Operations & Path Traversal Security', () => {
    it('should list starter files in workspace directory', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${user1WorkspaceId}/files`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.files).toBeDefined();
      const names = res.body.files.map((f: any) => f.name);
      expect(names).toContain('hello.sh');
    });

    it('should read file content', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${user1WorkspaceId}/file?path=hello.sh`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.content).toContain('Hello world from webCLI');
    });

    it('should write/save file content', async () => {
      const updatedText = '# Updated via WebCLI Code Editor\nconsole.log("Saved!");';
      const res = await request(app)
        .put(`/api/workspaces/${user1WorkspaceId}/file`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          path: 'index.js',
          content: updatedText,
        });

      expect(res.status).toBe(200);

      // Verify on disk
      const diskContent = fs.readFileSync(path.join(user1WorkspaceRoot, 'index.js'), 'utf8');
      expect(diskContent).toBe(updatedText);
    });

    it('should create a new file and directory', async () => {
      // Create folder
      const folderRes = await request(app)
        .post(`/api/workspaces/${user1WorkspaceId}/folder`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ path: 'src/components' });
      expect(folderRes.status).toBe(201);

      // Create file inside folder
      const fileRes = await request(app)
        .post(`/api/workspaces/${user1WorkspaceId}/file`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ path: 'src/components/Button.tsx' });
      expect(fileRes.status).toBe(201);

      expect(fs.existsSync(path.join(user1WorkspaceRoot, 'src/components/Button.tsx'))).toBe(true);
    });

    it('should rename a file', async () => {
      const res = await request(app)
        .post(`/api/workspaces/${user1WorkspaceId}/rename`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          oldPath: 'src/components/Button.tsx',
          newPath: 'src/components/CyberButton.tsx',
        });

      expect(res.status).toBe(200);
      expect(fs.existsSync(path.join(user1WorkspaceRoot, 'src/components/CyberButton.tsx'))).toBe(true);
      expect(fs.existsSync(path.join(user1WorkspaceRoot, 'src/components/Button.tsx'))).toBe(false);
    });

    it('should delete a file', async () => {
      const res = await request(app)
        .delete(`/api/workspaces/${user1WorkspaceId}/file?path=src/components/CyberButton.tsx`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(fs.existsSync(path.join(user1WorkspaceRoot, 'src/components/CyberButton.tsx'))).toBe(false);
    });

    it('should block Path Traversal attempts with ../ or absolute paths', async () => {
      const res = await request(app)
        .get(`/api/workspaces/${user1WorkspaceId}/file?path=../../../../etc/passwd`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Path traversal/i);
    });

    it('should block symlink escapes to host files outside workspace root', () => {
      const fakeEscapeSymlink = path.join(user1WorkspaceRoot, 'escape_link');
      try {
        fs.symlinkSync('/etc', fakeEscapeSymlink);
        expect(() => {
          resolveSafeWorkspacePath(user1WorkspaceRoot, 'escape_link/passwd', true);
        }).toThrow(SecurityError);
      } finally {
        if (fs.existsSync(fakeEscapeSymlink)) {
          fs.unlinkSync(fakeEscapeSymlink);
        }
      }
    });
  });

  describe('5. Real PTY Terminal Lifecycle & Interactive Execution', () => {
    it('should create and execute real Linux commands in a PTY session', async () => {
      const sessionId = `test_pty_${Date.now()}`;
      let receivedData = '';

      const session = await new Promise<any>((resolve, reject) => {
        const s = PtyService.createSession(
          sessionId,
          user1WorkspaceId,
          user1Id,
          user1WorkspaceRoot,
          80,
          24,
          (data) => {
            receivedData += data;
          },
          (code) => {}
        );
        setTimeout(() => resolve(s), 200);
      });

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);

      // Send command through PTY stdin
      PtyService.writeToSession(sessionId, user1Id, 'echo "WEBCLI_PTY_OK"\n');

      // Wait for output streaming
      await new Promise((r) => setTimeout(r, 600));
      expect(receivedData).toContain('WEBCLI_PTY_OK');

      // Test resize
      const resized = PtyService.resizeSession(sessionId, user1Id, 120, 40);
      expect(resized).toBe(true);

      // Close session
      const closed = PtyService.closeSession(sessionId, user1Id);
      expect(closed).toBe(true);
    });

    it('should prevent unauthorized users from accessing or writing to another user PTY session', () => {
      const sessionId = `unauth_pty_${Date.now()}`;
      PtyService.createSession(
        sessionId,
        user1WorkspaceId,
        user1Id,
        user1WorkspaceRoot,
        80,
        24,
        () => {},
        () => {}
      );

      // User 2 attempts to write to User 1's terminal
      const written = PtyService.writeToSession(sessionId, user2Id, 'malicious command\n');
      expect(written).toBe(false);

      // Cleanup
      PtyService.closeSession(sessionId, user1Id);
    });
  });
});
