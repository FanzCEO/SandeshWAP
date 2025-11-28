import * as fs from 'fs/promises';
import * as path from 'path';
import { watch } from 'fs';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Stats } from 'fs';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
}

export class FileSystemService extends EventEmitter {
  private basePath: string;
  private watcher: any = null;
  private watchedPaths: Set<string> = new Set();

  constructor(basePath?: string) {
    super();
    // Use current working directory if no base path provided
    this.basePath = basePath || process.cwd();
  }

  // Ensure path is within the base directory (security)
  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.basePath, relativePath);
    if (!resolved.startsWith(this.basePath)) {
      throw new Error('Access denied: Path outside project directory');
    }
    return resolved;
  }

  // Get relative path from absolute path
  private getRelativePath(absolutePath: string): string {
    return path.relative(this.basePath, absolutePath);
  }

  // Read directory structure recursively
  async readDirectory(dirPath: string = ''): Promise<FileNode[]> {
    const fullPath = this.resolvePath(dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const entry of entries) {
      // Skip hidden files and common ignore patterns
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' || 
          entry.name === 'dist' ||
          entry.name === 'build') {
        continue;
      }

      const entryPath = path.join(fullPath, entry.name);
      const relativePath = this.getRelativePath(entryPath);
      const stats = await fs.stat(entryPath);

      const node: FileNode = {
        id: randomUUID(),
        name: entry.name,
        path: relativePath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime
      };

      if (entry.isDirectory()) {
        try {
          node.children = await this.readDirectory(relativePath);
        } catch (error) {
          // Skip directories we can't read
          node.children = [];
        }
      }

      nodes.push(node);
    }

    return nodes.sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Read file content
  async readFile(filePath: string): Promise<FileContent> {
    const fullPath = this.resolvePath(filePath);
    
    // Check if file exists
    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }

    // Detect if file is binary
    const buffer = await fs.readFile(fullPath);
    const isBinary = this.isBinaryFile(buffer);
    
    if (isBinary) {
      return {
        path: filePath,
        content: '[Binary file]',
        encoding: 'binary'
      };
    }

    const content = buffer.toString('utf8');
    return {
      path: filePath,
      content,
      encoding: 'utf8'
    };
  }

  // Write file content
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    
    this.emit('fileChanged', { type: 'modified', path: filePath });
  }

  // Create new file
  async createFile(filePath: string, content: string = ''): Promise<void> {
    const fullPath = this.resolvePath(filePath);
    
    // Check if file already exists
    try {
      await fs.access(fullPath);
      throw new Error('File already exists');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    
    this.emit('fileChanged', { type: 'created', path: filePath });
  }

  // Create new directory
  async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolvePath(dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    
    this.emit('fileChanged', { type: 'created', path: dirPath });
  }

  // Delete file or directory
  async delete(targetPath: string): Promise<void> {
    const fullPath = this.resolvePath(targetPath);
    const stats = await fs.stat(fullPath);
    
    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
    
    this.emit('fileChanged', { type: 'deleted', path: targetPath });
  }

  // Rename file or directory
  async rename(oldPath: string, newName: string): Promise<string> {
    const fullOldPath = this.resolvePath(oldPath);
    const dir = path.dirname(fullOldPath);
    const fullNewPath = path.join(dir, newName);
    
    // Check if new path is within bounds
    if (!fullNewPath.startsWith(this.basePath)) {
      throw new Error('Access denied: Path outside project directory');
    }

    await fs.rename(fullOldPath, fullNewPath);
    const newRelativePath = this.getRelativePath(fullNewPath);
    
    this.emit('fileChanged', { 
      type: 'renamed', 
      oldPath, 
      newPath: newRelativePath 
    });
    
    return newRelativePath;
  }

  // Move file or directory
  async move(sourcePath: string, targetDir: string): Promise<string> {
    const fullSourcePath = this.resolvePath(sourcePath);
    const fullTargetDir = this.resolvePath(targetDir);
    const fileName = path.basename(fullSourcePath);
    const fullTargetPath = path.join(fullTargetDir, fileName);
    
    // Check if target path is within bounds
    if (!fullTargetPath.startsWith(this.basePath)) {
      throw new Error('Access denied: Path outside project directory');
    }

    // Create target directory if it doesn't exist
    await fs.mkdir(fullTargetDir, { recursive: true });
    await fs.rename(fullSourcePath, fullTargetPath);
    
    const newRelativePath = this.getRelativePath(fullTargetPath);
    
    this.emit('fileChanged', { 
      type: 'moved', 
      oldPath: sourcePath, 
      newPath: newRelativePath 
    });
    
    return newRelativePath;
  }

  // Search files by content
  async searchInFiles(query: string, options: {
    includePattern?: string;
    excludePattern?: string;
    caseSensitive?: boolean;
    maxResults?: number;
  } = {}): Promise<Array<{ path: string; line: number; content: string }>> {
    const results: Array<{ path: string; line: number; content: string }> = [];
    const maxResults = options.maxResults || 100;
    const regex = new RegExp(
      options.caseSensitive ? query : query.toLowerCase(),
      options.caseSensitive ? 'g' : 'gi'
    );

    async function searchDir(dir: string, service: FileSystemService): Promise<void> {
      if (results.length >= maxResults) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dir, entry.name);
        const relativePath = service.getRelativePath(fullPath);

        // Skip ignored patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' ||
            entry.name === 'build') {
          continue;
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath, service);
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (results.length >= maxResults) return;
              
              if (regex.test(line)) {
                results.push({
                  path: relativePath,
                  line: index + 1,
                  content: line.trim()
                });
              }
            });
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }

    await searchDir(this.basePath, this);
    return results;
  }

  // Check if file is binary
  private isBinaryFile(buffer: Buffer): boolean {
    const max = Math.min(buffer.length, 8192);
    for (let i = 0; i < max; i++) {
      const byte = buffer[i];
      if (byte === 0) return true; // NULL byte found
    }
    return false;
  }

  // Start watching file system changes
  startWatching(callback: (event: any) => void): void {
    this.on('fileChanged', callback);
    
    // Watch the base directory recursively
    this.watcher = watch(this.basePath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        this.emit('fileChanged', {
          type: eventType === 'rename' ? 'renamed' : 'modified',
          path: filename
        });
      }
    });
  }

  // Stop watching file system changes
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.removeAllListeners('fileChanged');
  }

  // Get project info
  async getProjectInfo(): Promise<{
    name: string;
    path: string;
    filesCount: number;
    size: number;
  }> {
    const projectName = path.basename(this.basePath);
    let filesCount = 0;
    let totalSize = 0;

    async function countFiles(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' ||
            entry.name === 'build') {
          continue;
        }

        if (entry.isDirectory()) {
          await countFiles(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          filesCount++;
          totalSize += stats.size;
        }
      }
    }

    await countFiles(this.basePath);

    return {
      name: projectName,
      path: this.basePath,
      filesCount,
      size: totalSize
    };
  }

  // Change base path (for project switching)
  changeBasePath(newPath: string): void {
    this.stopWatching();
    this.basePath = path.resolve(newPath);
  }
}

// Export singleton instance
export const fileSystem = new FileSystemService();