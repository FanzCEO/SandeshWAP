import { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  options?: monaco.editor.IEditorOptions;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export function MonacoEditor({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  readOnly = false,
  options = {},
  onMount
}: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const editorInstance = monaco.editor.create(editorRef.current, {
      value,
      language,
      theme,
      readOnly,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      ...options
    });

    setEditor(editorInstance);
    
    if (onMount) {
      onMount(editorInstance);
    }

    const subscription = editorInstance.onDidChangeModelContent(() => {
      const currentValue = editorInstance.getValue();
      onChange(currentValue);
    });

    return () => {
      subscription.dispose();
      editorInstance.dispose();
    };
  }, []);

  useEffect(() => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      monaco.editor.setModelLanguage(editor.getModel()!, language);
    }
  }, [language, editor]);

  return (
    <div 
      ref={editorRef} 
      className="h-full w-full"
      data-testid="monaco-editor"
    />
  );
}
