import chokidar, { FSWatcher } from 'chokidar';

export class WatcherService {
  private static watchers: Map<string, FSWatcher> = new Map();
  private static subscribers: Map<string, Set<(event: string, path: string) => void>> = new Map();

  static subscribe(workspaceId: string, rootPath: string, callback: (event: string, path: string) => void): () => void {
    if (!this.subscribers.has(workspaceId)) {
      this.subscribers.set(workspaceId, new Set());
    }
    const set = this.subscribers.get(workspaceId)!;
    set.add(callback);

    // If watcher does not exist yet for this workspace, create it
    if (!this.watchers.has(workspaceId)) {
      const watcher = chokidar.watch(rootPath, {
        ignored: [/(^|[\/\\])\../, '**/node_modules/**'], // ignore dotfiles and node_modules by default
        persistent: true,
        ignoreInitial: true,
        depth: 5,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      const notify = (event: string, filePath: string) => {
        const subs = this.subscribers.get(workspaceId);
        if (subs) {
          for (const cb of subs) {
            try {
              cb(event, filePath);
            } catch (err) {
              console.error('Error delivering fs event:', err);
            }
          }
        }
      };

      watcher
        .on('add', (p) => notify('add', p))
        .on('change', (p) => notify('change', p))
        .on('unlink', (p) => notify('unlink', p))
        .on('addDir', (p) => notify('addDir', p))
        .on('unlinkDir', (p) => notify('unlinkDir', p));

      this.watchers.set(workspaceId, watcher);
    }

    // Return unsubscribe function
    return () => {
      const currentSet = this.subscribers.get(workspaceId);
      if (currentSet) {
        currentSet.delete(callback);
        if (currentSet.size === 0) {
          // Close watcher if no more subscribers
          const watcher = this.watchers.get(workspaceId);
          if (watcher) {
            watcher.close();
            this.watchers.delete(workspaceId);
          }
          this.subscribers.delete(workspaceId);
        }
      }
    };
  }
}
