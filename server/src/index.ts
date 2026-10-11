import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { workspaceRouter } from './routes/workspace.routes.js';
import { fileRouter } from './routes/file.routes.js';
import { terminalRouter } from './routes/terminal.routes.js';
import { setupWebSocketServer } from './websocket.js';

export const app = express();
export const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in dev
if (CONFIG.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.originalUrl.startsWith('/api')) {
        console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
      }
    });
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: CONFIG.NODE_ENV,
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspaceRouter);
app.use('/api/workspaces', fileRouter);
app.use('/api/workspaces', terminalRouter);

// Serve built frontend in production or if client/dist exists
const clientDistPath = path.resolve('client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Setup WebSocket server
setupWebSocketServer(server);

// Start server if this file is run directly
if (process.env.NODE_ENV !== 'test') {
  server.listen(CONFIG.PORT, CONFIG.HOST, () => {
    console.log(`=================================================`);
    console.log(`⚡ WEBCLI Cloud Development Environment`);
    console.log(`🌐 Server listening at http://${CONFIG.HOST}:${CONFIG.PORT}`);
    console.log(`📁 Workspaces root: ${CONFIG.WORKSPACES_ROOT}`);
    console.log(`💾 SQLite data dir: ${CONFIG.DATA_DIR}`);
    console.log(`🐚 Default shell: ${CONFIG.DEFAULT_SHELL}`);
    console.log(`=================================================`);
  });

  const cleanup = () => {
    console.log('Shutting down WebCLI server...');
    server.close(() => {
      console.log('Server closed gracefully.');
      process.exit(0);
    });
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}
