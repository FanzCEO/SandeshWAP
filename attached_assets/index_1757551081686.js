import express from "express";
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
  console.log(`API + PTY on :${PORT}`);
});