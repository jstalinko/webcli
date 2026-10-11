import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'webcli-cyber-secret-key-391487291847192',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATA_DIR: path.resolve(process.env.DATA_DIR || './data'),
  WORKSPACES_ROOT: path.resolve(process.env.WORKSPACES_ROOT || './workspaces'),
  DEFAULT_SHELL: process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  RATE_LIMIT_LOGIN_MAX: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '10', 10),
};

// Ensure critical directories exist
if (!fs.existsSync(CONFIG.DATA_DIR)) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CONFIG.WORKSPACES_ROOT)) {
  fs.mkdirSync(CONFIG.WORKSPACES_ROOT, { recursive: true });
}
