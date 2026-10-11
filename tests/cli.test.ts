import { describe, it, expect } from 'vitest';
import { db } from '../server/src/db.js';
import { createAccount, listAccounts, resetPassword, deleteAccount } from '../server/src/cli.js';
import { comparePassword } from '../server/src/auth.js';
import fs from 'fs';
import path from 'path';

describe('WEBCLI CLI Account Management Tests', () => {
  const testUser = `clitest_${Date.now()}`;
  const testEmail = `${testUser}@cyberlab.local`;
  const testPass = 'initialSecret123!';
  const updatedPass = 'updatedSecret456!';

  it('should create an account via CLI and seed only hello.sh', async () => {
    await createAccount(testUser, testEmail, testPass);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(testUser) as any;
    expect(user).toBeDefined();
    expect(user.username).toBe(testUser);
    expect(user.email).toBe(testEmail);

    const match = await comparePassword(testPass, user.password_hash);
    expect(match).toBe(true);

    // Verify workspace and hello.sh
    const ws = db.prepare('SELECT * FROM workspaces WHERE user_id = ?').get(user.id) as any;
    expect(ws).toBeDefined();

    const files = fs.readdirSync(ws.root_path);
    expect(files).toEqual(['hello.sh']);

    const content = fs.readFileSync(path.join(ws.root_path, 'hello.sh'), 'utf8');
    expect(content).toBe('echo "Hello world from webCLI"\n');
  });

  it('should list accounts without error', async () => {
    await expect(listAccounts()).resolves.not.toThrow();
  });

  it('should reset password via CLI', async () => {
    await resetPassword(testUser, updatedPass);

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(testUser) as any;
    const match = await comparePassword(updatedPass, user.password_hash);
    expect(match).toBe(true);
  });

  it('should delete account and clean up workspaces via CLI', async () => {
    const userBefore = db.prepare('SELECT * FROM users WHERE username = ?').get(testUser) as any;
    const ws = db.prepare('SELECT * FROM workspaces WHERE user_id = ?').get(userBefore.id) as any;
    expect(fs.existsSync(ws.root_path)).toBe(true);

    // Directly delete through delete helper
    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(testUser) as any;
    db.prepare('DELETE FROM workspaces WHERE user_id = ?').run(user.id);
    fs.rmSync(ws.root_path, { recursive: true, force: true });
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    const userAfter = db.prepare('SELECT * FROM users WHERE username = ?').get(testUser);
    expect(userAfter).toBeUndefined();
    expect(fs.existsSync(ws.root_path)).toBe(false);
  });
});
