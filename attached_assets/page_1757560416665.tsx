
'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import * as monaco from 'monaco-editor';

type Template = { name: string; title?: string; stack?: string };

export default function Home() {
  const termRef = useRef<HTMLDivElement>(null);
  const editorContainer = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<string>('server/src/index.js');
  const [content, setContent] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [aiExplain, setAiExplain] = useState<string[]>([]);
  const [logsSuggestion, setLogsSuggestion] = useState<string>('');

  useEffect(() => {
    fetch('/api/templates').then(r=>r.json()).then(setTemplates).catch(()=>{});
    refreshProjects();
  }, []);

  const refreshProjects = () => fetch('/api/projects').then(r=>r.json()).then(setProjects).catch(()=>{});

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/file?p=${encodeURIComponent(file)}`);
      if (res.ok) setContent(await res.text());
      else setContent('');
    })();
  }, [file]);

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
    term.writeln('\x1b[1;36mWelcome to FANZ Devspaces Phase 2\x1b[0m');
    term.writeln('Tip: after creating a project, run: cd projects/<id> && npm install && npm start');
    return () => { window.removeEventListener('resize', onResize); ws.close(); term.dispose(); };
  }, []);

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

  const createProject = async (t: Template) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: t.name })
    });
    const data = await res.json();
    if (data.id) {
      refreshProjects();
      setFile(`projects/${data.id}/README.md`);
      await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `projects/${data.id}/README.md`, content: `# ${(t.title || t.name)}\nProject ${data.id}` })
      });
    } else {
      alert('Create failed');
    }
  };

  const runDryrun = async (cmd: string) => {
    const res = await fetch('/api/ai/dryrun', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ command: cmd }) });
    const data = await res.json();
    setAiExplain(data.plan || []);
  };

  const analyzeLogs = async () => {
    const res = await fetch('/api/ai/logs', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ logs: content }) });
    const data = await res.json();
    setLogsSuggestion(data.suggestion || '');
  };

  const requestDockerfile = async (stack: string) => {
    const res = await fetch('/api/ai/dockerfile', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ stack }) });
    const data = await res.json();
    setContent(data.dockerfile || '');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', height: '100vh' }}>
      <aside style={{ background:'#0b0b0b', color:'#fff', padding:12, overflowY:'auto' }}>
        <h3 style={{ marginTop:0 }}>Templates</h3>
        <ul style={{ listStyle:'none', padding:0, margin:0 }}>
          {templates.map(t => (
            <li key={t.name} style={{ marginBottom:8 }}>
              <button onClick={() => createProject(t)} style={{ width:'100%' }}>
                {(t.title || t.name)} {t.stack ? '• ' + t.stack : ''}
              </button>
            </li>
          ))}
        </ul>
        <h3>Projects</h3>
        <ul style={{ listStyle:'none', padding:0, margin:0 }}>
          {projects.map(id => (
            <li key={id} style={{ marginBottom:6 }}>
              <button onClick={() => { setFile('projects/' + id + '/README.md'); }} style={{ width:'100%' }}>{id}</button>
            </li>
          ))}
        </ul>
        <div style={{ marginTop:16 }}>
          <h3>AI Helpers</h3>
          <button onClick={() => runDryrun('npm install')}>Explain: npm install</button>
          <button onClick={() => requestDockerfile('node')} style={{ marginTop:6 }}>Gen Dockerfile (Node)</button>
          <button onClick={() => analyzeLogs()} style={{ marginTop:6 }}>Analyze current file as logs</button>
          {aiExplain.length>0 && <div style={{ fontSize:12, marginTop:8 }}>
            {aiExplain.map((l,i)=><div key={i}>• {l}</div>)}
          </div>}
          {logsSuggestion && <div style={{ fontSize:12, marginTop:8 }}>Suggestion: {logsSuggestion}</div>}
        </div>
      </aside>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 8, background: '#111', color: '#fff', fontSize: 12, display: 'flex', gap:8, alignItems:'center' }}>
          <span>Monaco — {file}</span>
          <input value={file} onChange={(e)=>setFile(e.target.value)} style={{ flex:1, marginLeft:8 }} />
          <button onClick={save}>Save</button>
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
