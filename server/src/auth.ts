import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { CONFIG } from './config.js';
import { db } from './db.js';

export interface UserSafe {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthRequest extends Request {
  user?: UserSafe;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: UserSafe): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    CONFIG.JWT_SECRET,
    { expiresIn: CONFIG.JWT_EXPIRES_IN as any }
  );
}

export function verifyToken(token: string): UserSafe | null {
  try {
    const payload = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    const stmt = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?');
    const user = stmt.get(payload.id) as UserSafe | undefined;
    return user || null;
  } catch (err) {
    return null;
  }
}

export function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.user = user;
  next();
}
