import path from 'path';
import fs from 'fs';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validates and resolves a relative path within a workspace root,
 * guaranteeing that it cannot escape via path traversal or symlinks.
 * 
 * @param workspaceRoot Absolute canonical path to the workspace root
 * @param relativePath User-supplied path relative to workspace root
 * @param mustExist If true, checks that the target file/folder exists
 * @returns Safe, resolved absolute path
 */
export function resolveSafeWorkspacePath(
  workspaceRoot: string,
  relativePath: string,
  mustExist: boolean = false
): string {
  if (typeof relativePath !== 'string') {
    throw new SecurityError('Invalid path format');
  }

  // Reject null bytes
  if (relativePath.includes('\0')) {
    throw new SecurityError('Null byte detected in path');
  }

  // Ensure workspace root is canonical
  let canonicalWorkspaceRoot: string;
  try {
    canonicalWorkspaceRoot = fs.realpathSync(workspaceRoot);
  } catch (err) {
    // If workspaceRoot doesn't exist yet, resolve lexically
    canonicalWorkspaceRoot = path.resolve(workspaceRoot);
  }

  // Strip leading slash if any to treat as relative to workspace root
  const cleanRelative = relativePath.replace(/^(\/|\\)+/, '');
  const resolvedTarget = path.resolve(canonicalWorkspaceRoot, cleanRelative);

  // Initial lexical check
  if (
    resolvedTarget !== canonicalWorkspaceRoot &&
    !resolvedTarget.startsWith(canonicalWorkspaceRoot + path.sep)
  ) {
    throw new SecurityError(`Path traversal attempt detected: ${relativePath}`);
  }

  if (mustExist) {
    if (!fs.existsSync(resolvedTarget)) {
      throw new Error(`File or directory does not exist: ${relativePath}`);
    }

    // Canonical check on existing target to catch symlink escapes
    try {
      const canonicalTarget = fs.realpathSync(resolvedTarget);
      if (
        canonicalTarget !== canonicalWorkspaceRoot &&
        !canonicalTarget.startsWith(canonicalWorkspaceRoot + path.sep)
      ) {
        throw new SecurityError(`Symlink escape detected: ${relativePath}`);
      }
      return canonicalTarget;
    } catch (err: any) {
      throw new SecurityError(`Failed to resolve realpath: ${err.message}`);
    }
  } else {
    // For targets that might not exist yet (e.g. creating new file)
    // Check the existing ancestor path to prevent creating files through a symlinked folder
    let current = resolvedTarget;
    while (!fs.existsSync(current) && current !== canonicalWorkspaceRoot) {
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }

    if (fs.existsSync(current)) {
      const canonicalCurrent = fs.realpathSync(current);
      if (
        canonicalCurrent !== canonicalWorkspaceRoot &&
        !canonicalCurrent.startsWith(canonicalWorkspaceRoot + path.sep)
      ) {
        throw new SecurityError(`Symlink escape detected in path ancestor: ${relativePath}`);
      }
    }

    return resolvedTarget;
  }
}
