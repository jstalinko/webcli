import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { verifyToken, UserSafe } from './auth.js';
import { WorkspaceService } from './services/workspace.service.js';
import { PtyService } from './services/pty.service.js';
import { WatcherService } from './services/watcher.service.js';

interface AuthenticatedWebSocket extends WebSocket {
  user?: UserSafe;
  isAlive?: boolean;
}

export function setupWebSocketServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade with authentication
  httpServer.on('upgrade', (request, socket, head) => {
    const parsedUrl = url.parse(request.url || '', true);
    const pathname = parsedUrl.pathname;

    if (pathname !== '/ws') {
      socket.destroy();
      return;
    }

    // Extract token from query param or sec-websocket-protocol
    const token = (parsedUrl.query.token as string) || 
      (request.headers['sec-websocket-protocol'] ? request.headers['sec-websocket-protocol'].split(',')[0].trim() : undefined);

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const authWs = ws as AuthenticatedWebSocket;
      authWs.user = user;
      authWs.isAlive = true;
      wss.emit('connection', authWs, request);
    });
  });

  // Heartbeat interval to detect dead sockets
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const authWs = ws as AuthenticatedWebSocket;
      if (authWs.isAlive === false) {
        return authWs.terminate();
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: AuthenticatedWebSocket) => {
    const user = ws.user!;
    const unsubscribeFns: (() => void)[] = [];

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (rawMessage: Buffer) => {
      try {
        const msg = JSON.parse(rawMessage.toString());

        switch (msg.type) {
          case 'terminal_init': {
            const { sessionId, workspaceId, cols, rows } = msg;
            if (!sessionId || !workspaceId) return;

            const workspace = WorkspaceService.getWorkspace(workspaceId, user.id);
            if (!workspace) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unauthorized workspace access for terminal',
              }));
              return;
            }

            // Create or bind real PTY session
            PtyService.createSession(
              sessionId,
              workspaceId,
              user.id,
              workspace.root_path,
              cols || 80,
              rows || 24,
              (data: string) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'terminal_output',
                    sessionId,
                    data,
                  }));
                }
              },
              (code: number) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    type: 'terminal_exit',
                    sessionId,
                    code,
                  }));
                }
              }
            );

            ws.send(JSON.stringify({
              type: 'terminal_ready',
              sessionId,
              workspaceId,
            }));
            break;
          }

          case 'terminal_input': {
            const { sessionId, data } = msg;
            if (sessionId && data !== undefined) {
              PtyService.writeToSession(sessionId, user.id, data);
            }
            break;
          }

          case 'terminal_resize': {
            const { sessionId, cols, rows } = msg;
            if (sessionId && cols && rows) {
              PtyService.resizeSession(sessionId, user.id, cols, rows);
            }
            break;
          }

          case 'terminal_close': {
            const { sessionId } = msg;
            if (sessionId) {
              PtyService.closeSession(sessionId, user.id);
            }
            break;
          }

          case 'watch_workspace': {
            const { workspaceId } = msg;
            if (!workspaceId) return;

            const workspace = WorkspaceService.getWorkspace(workspaceId, user.id);
            if (!workspace) return;

            const unsub = WatcherService.subscribe(workspaceId, workspace.root_path, (event, filePath) => {
              if (ws.readyState === WebSocket.OPEN) {
                // Calculate relative path
                const relPath = filePath.replace(workspace.root_path, '').replace(/^[\/\\]/, '');
                ws.send(JSON.stringify({
                  type: 'fs_event',
                  workspaceId,
                  event,
                  path: relPath.replace(/\\/g, '/'),
                }));
              }
            });

            unsubscribeFns.push(unsub);
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }

          default:
            break;
        }
      } catch (err: any) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      // Clean up subscriptions
      for (const unsub of unsubscribeFns) {
        unsub();
      }
    });
  });

  return wss;
}
