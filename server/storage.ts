import { users, files, type User, type InsertUser, type File, type InsertFile } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(username: string, password: string): Promise<User | null>;
  getFile(path: string): Promise<File | undefined>;
  createOrUpdateFile(file: InsertFile): Promise<File>;
  listFiles(): Promise<File[]>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  private async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      // Check if we have any files, if not, add sample data
      const existingFiles = await db.select().from(files).limit(1);
      
      if (existingFiles.length === 0) {
        await this.initializeSampleFiles();
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize sample files:', error);
      this.initialized = true; // Mark as initialized to prevent retrying
    }
  }

  private async initializeSampleFiles() {
    const sampleFiles = [
      {
        path: "server/src/index.js",
        content: `import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { spawn } from "node-pty";
import http from "http";
import fs from "fs/promises";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

app.get("/api/file", async (req, res) => {
  const p = req.query.p;
  if (!p) return res.status(400).json({ error: "missing p" });
  try {
    const data = await fs.readFile(p, "utf8");
    res.type("text/plain").send(data);
  } catch (e) {
    res.status(404).json({ error: "not found" });
  }
});

app.post("/api/file", async (req, res) => {
  const { path: p, content } = req.body || {};
  if (!p) return res.status(400).json({ error: "missing path" });
  await fs.writeFile(p, content ?? "", "utf8");
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/pty" });

wss.on("connection", (socket) => {
  const shell = process.env.SHELL || "bash";
  const pty = spawn(shell, [], {
    name: "xterm-color",
    cols: 120,
    rows: 30,
    cwd: process.cwd(),
    env: process.env,
  });

  pty.onData((data) => socket.send(data));
  socket.on("message", (msg) => {
    try {
      const evt = JSON.parse(msg.toString());
      if (evt.type === "stdin") pty.write(evt.data);
      if (evt.type === "resize") pty.resize(evt.cols, evt.rows);
    } catch {
      pty.write(msg.toString());
    }
  });
  socket.on("close", () => pty.kill());
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(\`API + PTY on :\${PORT}\`);
});`
      },
      {
        path: "package.json",
        content: `{
  "name": "sandesh-wap-mvp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "cors": "2.8.5",
    "express": "4.19.2",
    "node-pty": "1.0.0",
    "ws": "8.18.0"
  }
}`
      },
      {
        path: "README.md",
        content: `# Sandesh WAP MVP

A modern web application platform with browser-based development environment, Monaco editor and live terminal.

## Features
- Monaco code editor with syntax highlighting
- Live terminal with PTY backend
- File system operations
- Split-pane layout
- WebSocket terminal communication

## Usage
1. Open files in the editor
2. Use the terminal to run commands
3. Save changes with Ctrl+S`
      }
    ];

    // Insert sample files using upsert to avoid conflicts
    for (const file of sampleFiles) {
      await db
        .insert(files)
        .values({ path: file.path, content: file.content })
        .onConflictDoUpdate({
          target: files.path,
          set: {
            content: file.content,
            updatedAt: sql`now()`
          }
        });
    }
  }
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(insertUser.password, saltRounds);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword
      })
      .returning();
    return user;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  }

  async getFile(path: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.path, path));
    return file || undefined;
  }

  async createOrUpdateFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values(insertFile)
      .onConflictDoUpdate({
        target: files.path,
        set: {
          content: insertFile.content,
          updatedAt: sql`now()`
        }
      })
      .returning();
    
    return file;
  }

  async listFiles(): Promise<File[]> {
    await this.ensureInitialized();
    return db.select().from(files);
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private files: Map<string, File>;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    
    // Initialize with sample files
    this.initializeSampleFiles();
  }

  private initializeSampleFiles() {
    const sampleFiles = [
      {
        path: "server/src/index.js",
        content: `import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { spawn } from "node-pty";
import http from "http";
import fs from "fs/promises";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

app.get("/api/file", async (req, res) => {
  const p = req.query.p;
  if (!p) return res.status(400).json({ error: "missing p" });
  try {
    const data = await fs.readFile(p, "utf8");
    res.type("text/plain").send(data);
  } catch (e) {
    res.status(404).json({ error: "not found" });
  }
});

app.post("/api/file", async (req, res) => {
  const { path: p, content } = req.body || {};
  if (!p) return res.status(400).json({ error: "missing path" });
  await fs.writeFile(p, content ?? "", "utf8");
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/pty" });

wss.on("connection", (socket) => {
  const shell = process.env.SHELL || "bash";
  const pty = spawn(shell, [], {
    name: "xterm-color",
    cols: 120,
    rows: 30,
    cwd: process.cwd(),
    env: process.env,
  });

  pty.onData((data) => socket.send(data));
  socket.on("message", (msg) => {
    try {
      const evt = JSON.parse(msg.toString());
      if (evt.type === "stdin") pty.write(evt.data);
      if (evt.type === "resize") pty.resize(evt.cols, evt.rows);
    } catch {
      pty.write(msg.toString());
    }
  });
  socket.on("close", () => pty.kill());
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(\`API + PTY on :\${PORT}\`);
});`
      },
      {
        path: "package.json",
        content: `{
  "name": "sandesh-wap-mvp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "cors": "2.8.5",
    "express": "4.19.2",
    "node-pty": "1.0.0",
    "ws": "8.18.0"
  }
}`
      },
      {
        path: "README.md",
        content: `# Sandesh WAP MVP

A modern web application platform with browser-based development environment, Monaco editor and live terminal.

## Features
- Monaco code editor with syntax highlighting
- Live terminal with PTY backend
- File system operations
- Split-pane layout
- WebSocket terminal communication

## Usage
1. Open files in the editor
2. Use the terminal to run commands
3. Save changes with Ctrl+S`
      }
    ];

    sampleFiles.forEach(file => {
      const id = randomUUID();
      const fileRecord: File = {
        id,
        path: file.path,
        content: file.content,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.files.set(file.path, fileRecord);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    
    // In MemStorage, passwords are stored as plaintext for simplicity
    // In a real application, you'd want consistent hashing across storage types
    return user.password === password ? user : null;
  }

  async getFile(path: string): Promise<File | undefined> {
    return this.files.get(path);
  }

  async createOrUpdateFile(insertFile: InsertFile): Promise<File> {
    const existing = this.files.get(insertFile.path);
    if (existing) {
      const updated: File = {
        ...existing,
        content: insertFile.content,
        updatedAt: new Date()
      };
      this.files.set(insertFile.path, updated);
      return updated;
    } else {
      const id = randomUUID();
      const file: File = {
        id,
        ...insertFile,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.files.set(insertFile.path, file);
      return file;
    }
  }

  async listFiles(): Promise<File[]> {
    return Array.from(this.files.values());
  }
}

export const storage = new DatabaseStorage();
