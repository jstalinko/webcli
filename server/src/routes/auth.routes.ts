import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { hashPassword, comparePassword, generateToken, authenticateUser, AuthRequest, UserSafe } from '../auth.js';
import { WorkspaceService } from '../services/workspace.service.js';

export const authRouter = Router();

// Register new user
authRouter.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'A user with that username or email already exists.' });
    }

    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(id, username, email, password_hash, 'user', now);

    const userSafe: UserSafe = {
      id,
      username,
      email,
      role: 'user',
      created_at: now,
    };

    // Auto-create initial default workspace
    WorkspaceService.createWorkspace(id, 'Default Workspace', 'Primary development workspace');

    const token = generateToken(userSafe);

    return res.status(201).json({
      user: userSafe,
      token,
      message: 'Account created successfully.',
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?');
    const user = stmt.get(username, username) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const userSafe: UserSafe = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };

    const token = generateToken(userSafe);

    return res.json({
      user: userSafe,
      token,
      message: 'Authentication successful.',
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Get current authenticated user
authRouter.get('/me', authenticateUser, (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

// Logout
authRouter.post('/logout', (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
});
