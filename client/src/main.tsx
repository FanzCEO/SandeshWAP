import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configure Monaco Environment for Web Workers before any Monaco imports
// Using self instead of window for better compatibility
(self as any).MonacoEnvironment = {
  getWorker: function (_: any, label: string) {
    const getWorkerModule = (moduleUrl: string, label: string) => {
      return new Worker((self as any).MonacoEnvironment.getWorkerUrl(moduleUrl, label), {
        name: label,
        type: 'module'
      });
    };

    switch (label) {
      case 'json':
        return getWorkerModule('/monaco-editor/esm/vs/language/json/json.worker?worker', label);
      case 'css':
      case 'scss':
      case 'less':
        return getWorkerModule('/monaco-editor/esm/vs/language/css/css.worker?worker', label);
      case 'html':
      case 'handlebars':
      case 'razor':
        return getWorkerModule('/monaco-editor/esm/vs/language/html/html.worker?worker', label);
      case 'typescript':
      case 'javascript':
        return getWorkerModule('/monaco-editor/esm/vs/language/typescript/ts.worker?worker', label);
      default:
        return getWorkerModule('/monaco-editor/esm/vs/editor/editor.worker?worker', label);
    }
  },
  getWorkerUrl: function (_: string, label: string) {
    if (label === 'json') {
      return '/monaco-editor/esm/vs/language/json/json.worker.js';
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return '/monaco-editor/esm/vs/language/css/css.worker.js';
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return '/monaco-editor/esm/vs/language/html/html.worker.js';
    }
    if (label === 'typescript' || label === 'javascript') {
      return '/monaco-editor/esm/vs/language/typescript/ts.worker.js';
    }
    return '/monaco-editor/esm/vs/editor/editor.worker.js';
  }
};

createRoot(document.getElementById("root")!).render(<App />);
