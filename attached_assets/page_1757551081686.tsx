'use client';
import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import * as monaco from 'monaco-editor';

export default function Home() {
  const termRef = useRef<HTMLDivElement>(null);
  const editorContainer = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<string>('server/src/index.js');
  const [content, setContent] = useState<string>('');

  // Fetch file content on load
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/file?p=${encodeURIComponent(file)}`);
      if (res.ok) setContent(await res.text());
    })();
  }, [file]);

  // Terminal
  useEffect(() => {
    if (!termRef.current) return;
    const term = new Terminal({ fontSize: 14, convertEol: true });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(termRef.current);
    fit.fit();

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host.replace(/:\d+$/, ':3001')}/ws/pty`);
    ws.onmessage = (e) => term.write(e.data);
    term.onData((d) => ws.send(JSON.stringify({ type: 'stdin', data: d })));

    const onResize = () => { fit.fit(); ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows })); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); ws.close(); term.dispose(); };
  }, []);

  // Editor
  useEffect(() => {
    if (!editorContainer.current) return;
    const ed = monaco.editor.create(editorContainer.current, {
      value: content,
      language: file.endsWith('.ts') || file.endsWith('.tsx') ? 'typescript' : 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false }
    });
    const sub = ed.onDidChangeModelContent(() => setContent(ed.getValue()));
    return () => { sub.dispose(); ed.dispose(); };
  }, [editorContainer.current, file]); // eslint-disable-line

  const save = async () => {
    await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file, content })
    });
    alert('Saved ✅');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 8, background: '#111', color: '#fff', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>Monaco Editor — {file}</span>
          <button onClick={save} style={{ padding: '4px 8px', background: '#222', borderRadius: 6, color: '#fff' }}>Save</button>
        </div>
        <div ref={editorContainer} style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 8, background: '#111', color: '#fff', fontSize: 12 }}>Terminal</div>
        <div ref={termRef} style={{ flex: 1, overflow: 'hidden' }} />
      </div>
    </div>
  );
}