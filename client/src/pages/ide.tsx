import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/providers/theme-provider';
import { MonacoEditor } from '@/components/monaco-editor';
import { TerminalComponent } from '@/components/terminal';
import { FileExplorerEnhanced } from '@/components/file-explorer-enhanced';
import { ResizablePanes } from '@/components/resizable-panes';
import { ProjectManager } from '@/components/project-manager';
import { GlobalSearch } from '@/components/global-search';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsDialog } from '@/components/settings-dialog';
import { CommandPaletteTrigger } from '@/components/command-palette-trigger';
import { AICodeAssistant } from '@/components/ai-code-assistant';
import { WelcomeScreen } from '@/components/welcome-screen';
import { LoadingSpinner } from '@/components/loading-spinner';
import { FileTreeSkeleton, EditorSkeleton } from '@/components/loading-skeleton';
import { TemplatesCatalog } from '@/components/templates-catalog';
import { 
  X, Save, Settings, Keyboard, FileCode, Search, Code, WrapText, 
  Minimize2, Maximize2, GitBranch, FolderOpen, Rocket, FolderPlus
} from 'lucide-react';
import type { FileNode, FileContent, SearchResult } from '@shared/schema';
import * as monaco from 'monaco-editor';

interface OpenTab {
  file: FileNode;
  content: string;
  hasUnsavedChanges: boolean;
  id: string;
}

interface EditorSettings {
  autoSaveEnabled: boolean;
  autoSaveDelay: number;
  minimapEnabled: boolean;
  lineNumbersEnabled: boolean;
  wordWrapEnabled: boolean;
  fontSize: number;
}

const DEFAULT_SETTINGS: EditorSettings = {
  autoSaveEnabled: true,
  autoSaveDelay: 2000,
  minimapEnabled: false,
  lineNumbersEnabled: true,
  wordWrapEnabled: true,
  fontSize: 14,
};

export default function IDE() {
  const { theme, uiSettings } = useTheme();
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [currentProjectPath, setCurrentProjectPath] = useState<string>('');
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    const hideWelcome = localStorage.getItem('hideWelcomeScreen');
    return !hideWelcome || hideWelcome === 'false';
  });
  const [showTemplatesCatalog, setShowTemplatesCatalog] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => {
    const saved = localStorage.getItem('editorSettings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('editorSettings', JSON.stringify(editorSettings));
  }, [editorSettings]);

  // Fetch file content for active tab
  const { data: fileData } = useQuery<FileContent>({
    queryKey: ['/api/file', { path: activeTab?.file.path }],
    enabled: !!activeTab && activeTab.file.type === 'file',
  });

  // Update tab content when file data changes
  useEffect(() => {
    if (fileData && activeTab && fileData.content !== activeTab.content) {
      setOpenTabs(prev => prev.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content: fileData.content, hasUnsavedChanges: false }
          : tab
      ));
    }
  }, [fileData, activeTab, activeTabId]);

  // Save file mutation
  const saveFileMutation = useMutation({
    mutationFn: async (data: { path: string; content: string }) => {
      const response = await apiRequest('POST', '/api/file', data);
      return response.json();
    },
    onSuccess: (_, variables) => {
      setIsAutoSaving(false);
      setOpenTabs(prev => prev.map(tab => 
        tab.file.path === variables.path 
          ? { ...tab, hasUnsavedChanges: false }
          : tab
      ));
      toast({
        title: "File saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/file', { path: variables.path }] });
    },
    onError: () => {
      setIsAutoSaving(false);
      toast({
        title: "Save failed",
        description: "There was an error saving your file.",
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileSelect = useCallback(async (file: FileNode) => {
    if (file.type !== 'file') return;

    // Check if file is already open
    const existingTab = openTabs.find(tab => tab.file.path === file.path);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Fetch file content
    try {
      const response = await apiRequest('GET', `/api/file?path=${encodeURIComponent(file.path)}`);
      const fileContent: FileContent = await response.json();
      
      // Create new tab
      const newTab: OpenTab = {
        file,
        content: fileContent.content || '',
        hasUnsavedChanges: false,
        id: `${file.path}-${Date.now()}`,
      };
      
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (error) {
      toast({
        title: "Failed to open file",
        description: "Could not read the file content.",
        variant: "destructive",
      });
    }
  }, [openTabs, toast]);

  // Handle search result click
  const handleSearchResultClick = useCallback(async (result: SearchResult) => {
    // Create a FileNode from the search result
    const fileNode: FileNode = {
      id: result.path,
      name: result.path.split('/').pop() || result.path,
      path: result.path,
      type: 'file'
    };
    
    await handleFileSelect(fileNode);
    
    // Jump to the line
    if (editorRef.current && result.line) {
      setTimeout(() => {
        editorRef.current?.revealLineInCenter(result.line);
        editorRef.current?.setPosition({ lineNumber: result.line, column: 1 });
        editorRef.current?.focus();
      }, 100);
    }
  }, [handleFileSelect]);

  // Handle editor content change
  const handleEditorChange = useCallback((value: string) => {
    if (!activeTab) return;

    setOpenTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content: value, hasUnsavedChanges: tab.content !== value }
        : tab
    ));

    // Auto-save logic
    if (editorSettings.autoSaveEnabled && activeTab.content !== value) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        setIsAutoSaving(true);
        saveFileMutation.mutate({
          path: activeTab.file.path,
          content: value
        });
      }, editorSettings.autoSaveDelay);
    }
  }, [activeTab, activeTabId, editorSettings, saveFileMutation]);

  // Save current file
  const handleSave = useCallback(() => {
    if (!activeTab || !activeTab.hasUnsavedChanges) return;
    
    saveFileMutation.mutate({
      path: activeTab.file.path,
      content: activeTab.content
    });
  }, [activeTab, saveFileMutation]);

  // Format code
  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
      toast({
        title: "Code formatted",
        description: "Your code has been formatted successfully.",
      });
    }
  }, [toast]);

  // Close tab
  const handleCloseTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const tabToClose = openTabs.find(tab => tab.id === tabId);
    if (tabToClose?.hasUnsavedChanges) {
      const shouldClose = window.confirm('This file has unsaved changes. Are you sure you want to close it?');
      if (!shouldClose) return;
    }

    setOpenTabs(prev => prev.filter(tab => tab.id !== tabId));
    
    if (activeTabId === tabId) {
      const remainingTabs = openTabs.filter(tab => tab.id !== tabId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : null);
    }
  }, [openTabs, activeTabId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Format: Alt + Shift + F
      if (e.altKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        handleFormat();
      }
      
      // Close tab: Ctrl/Cmd + W
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) {
          handleCloseTab(activeTabId);
        }
      }
      
      // Global search: Ctrl/Cmd + Shift + F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      
      // Settings: Ctrl/Cmd + ,
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }
      
      // Next tab: Ctrl + Tab
      if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
        const nextIndex = (currentIndex + 1) % openTabs.length;
        if (openTabs[nextIndex]) {
          setActiveTabId(openTabs[nextIndex].id);
        }
      }
      
      // Previous tab: Ctrl + Shift + Tab
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = openTabs.findIndex(tab => tab.id === activeTabId);
        const prevIndex = currentIndex === 0 ? openTabs.length - 1 : currentIndex - 1;
        if (openTabs[prevIndex]) {
          setActiveTabId(openTabs[prevIndex].id);
        }
      }
      
      // Find: Ctrl/Cmd + F
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'f') {
        e.preventDefault();
        if (editorRef.current) {
          editorRef.current.getAction('actions.find')?.run();
        }
      }
      
      // AI Assistant: Ctrl/Cmd + Shift + A
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        // Get selected text from Monaco editor
        if (editorRef.current) {
          const selection = editorRef.current.getSelection();
          const model = editorRef.current.getModel();
          if (selection && model) {
            const selectedText = model.getValueInRange(selection);
            if (selectedText) {
              setSelectedCode(selectedText);
            }
          }
        }
        setShowAIAssistant(true);
      }
      
      // Replace: Ctrl/Cmd + H
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        if (editorRef.current) {
          editorRef.current.getAction('editor.action.startFindReplaceAction')?.run();
        }
      }
      
      // Show shortcuts: F1
      if (e.key === 'F1') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, openTabs, handleSave, handleFormat, handleCloseTab]);

  const handleProjectChange = (projectPath: string) => {
    setCurrentProjectPath(projectPath);
    // Close all tabs when changing project
    setOpenTabs([]);
    setActiveTabId(null);
    
    // Hide welcome screen when project is selected
    setShowWelcomeScreen(false);
    localStorage.setItem('hideWelcomeScreen', 'true');
    
    // Refresh file tree
    queryClient.invalidateQueries({ queryKey: ['/api/files'] });
  };

  const handleWelcomeAction = (action: 'new' | 'open' | 'clone') => {
    setShowWelcomeScreen(false);
    localStorage.setItem('hideWelcomeScreen', 'true');
    
    switch (action) {
      case 'new':
        setShowTemplatesCatalog(true);
        break;
      case 'open':
        // Trigger project open functionality
        toast({ title: 'Open project', description: 'Feature coming soon!' });
        break;
      case 'clone':
        toast({ title: 'Clone repository', description: 'Feature coming soon!' });
        break;
    }
  };

  // Handle project created from template
  const handleProjectCreated = useCallback(async (projectPath: string, projectName: string) => {
    try {
      // Change to the new project directory
      const response = await apiRequest('POST', '/api/project/change', { path: projectPath });
      if (response.ok) {
        // Refresh the file tree
        await queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/project'] });
        
        // Update current project path
        setCurrentProjectPath(projectPath);
        
        // Close all tabs
        setOpenTabs([]);
        setActiveTabId(null);
        
        toast({
          title: "Project loaded",
          description: `Now working on: ${projectName}`,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to load project",
        description: "There was an error switching to the new project.",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

  const getLanguageFromPath = (path: string) => {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'css':
        return 'css';
      case 'html':
        return 'html';
      case 'py':
        return 'python';
      default:
        return 'javascript';
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'text-yellow-400';
      case 'json':
        return 'text-green-400';
      case 'md':
        return 'text-gray-400';
      case 'css':
        return 'text-blue-400';
      case 'html':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <motion.div 
      className="flex flex-col h-screen bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Welcome Screen */}
      <WelcomeScreen
        isOpen={showWelcomeScreen}
        onClose={() => {
          setShowWelcomeScreen(false);
          localStorage.setItem('hideWelcomeScreen', 'true');
        }}
        onProjectAction={handleWelcomeAction}
        recentProjects={[]}
      />

      {/* Top Bar */}
      <motion.header 
        className="flex items-center justify-between px-4 py-2 bg-card border-b border-border glass-card"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
      >
        <div className="flex items-center space-x-4">
          <motion.div 
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <motion.div 
              className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg hover-glow"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            >
              <Rocket className="text-primary-foreground text-lg" />
            </motion.div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Sandesh WAP</h1>
          </motion.div>
          
          <ProjectManager onProjectChange={handleProjectChange} />
          
          <nav className="flex items-center space-x-1">
            <motion.button 
              className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-all hover-lift"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-explorer"
            >
              <FolderOpen className="w-4 h-4 inline mr-2" />Explorer
            </motion.button>
            <motion.button 
              className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-all hover-lift"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGlobalSearch(true)}
              data-testid="button-global-search"
            >
              <Search className="w-4 h-4 inline mr-2" />Search
            </motion.button>
            <motion.button 
              className="px-3 py-1.5 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-all hover-lift"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-git"
            >
              <GitBranch className="w-4 h-4 inline mr-2" />Git
            </motion.button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <AnimatePresence>
            {isAutoSaving && (
              <motion.div 
                className="flex items-center space-x-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Save className="w-4 h-4" />
                </motion.div>
                <span>Auto-saving...</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div 
            className="flex items-center space-x-2 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div 
              className="w-2 h-2 bg-green-500 rounded-full shadow-lg"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)" }}
            />
            <span>Connected</span>
          </motion.div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTemplatesCatalog(true)}
            data-testid="button-new-project"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowShortcuts(true)}
            data-testid="button-shortcuts"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Shortcuts
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettings(true)}
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <FileExplorerEnhanced 
          onFileSelect={handleFileSelect}
          selectedFile={activeTab?.file}
          projectPath={currentProjectPath}
        />

        {/* Editor and Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center bg-card border-b border-border overflow-x-auto">
              <div className="flex">
                {openTabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`flex items-center px-4 py-2 border-r border-border cursor-pointer transition-colors ${
                      activeTabId === tab.id ? 'bg-background' : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => setActiveTabId(tab.id)}
                    data-testid={`tab-${tab.id}`}
                  >
                    <FileCode className={`w-4 h-4 mr-2 ${getFileIcon(tab.file.name)}`} />
                    <span className="text-sm font-medium">{tab.file.name}</span>
                    {tab.hasUnsavedChanges && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full ml-2" />
                    )}
                    <button
                      className="ml-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      data-testid={`button-close-tab-${tab.id}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex-1"></div>
              
              {activeTab && (
                <div className="flex items-center space-x-2 px-4 py-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleFormat}
                    title="Format Code (Alt+Shift+F)"
                    data-testid="button-format"
                  >
                    <Code className="w-4 h-4" />
                  </Button>
                  
                  <Button 
                    onClick={handleSave}
                    disabled={!activeTab.hasUnsavedChanges || saveFileMutation.isPending}
                    size="sm"
                    data-testid="button-save"
                  >
                    <Save className={`w-4 h-4 mr-2 ${saveFileMutation.isPending ? 'animate-spin' : ''}`} />
                    <span>{saveFileMutation.isPending ? 'Saving...' : 'Save'}</span>
                    <span className="text-xs opacity-75 ml-2">⌘S</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Split View */}
          <ResizablePanes
            leftPane={
              <div className="flex flex-col h-full">
                {activeTab ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <FileCode className="w-4 h-4" />
                        <span>{getLanguageFromPath(activeTab.file.path)}</span>
                        <span>•</span>
                        <span>UTF-8</span>
                        <span>•</span>
                        <span>LF</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditorSettings(prev => ({ ...prev, minimapEnabled: !prev.minimapEnabled }))}
                          title="Toggle Minimap"
                          data-testid="button-toggle-minimap"
                        >
                          {editorSettings.minimapEnabled ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditorSettings(prev => ({ ...prev, wordWrapEnabled: !prev.wordWrapEnabled }))}
                          title="Toggle Word Wrap"
                          data-testid="button-toggle-wordwrap"
                        >
                          <WrapText className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (editorRef.current) {
                              editorRef.current.getAction('actions.find')?.run();
                            }
                          }}
                          title="Find (Ctrl+F)"
                          data-testid="button-find"
                        >
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <MonacoEditor
                        value={activeTab.content}
                        onChange={handleEditorChange}
                        language={getLanguageFromPath(activeTab.file.path)}
                        theme={theme.editor.theme}
                        options={{
                          minimap: { enabled: editorSettings.minimapEnabled },
                          lineNumbers: editorSettings.lineNumbersEnabled ? 'on' : 'off',
                          wordWrap: editorSettings.wordWrapEnabled ? 'on' : 'off',
                          fontSize: theme.editor.fontSize,
                          fontFamily: theme.editor.fontFamily,
                          lineHeight: theme.editor.lineHeight,
                        }}
                        onMount={(editor) => {
                          editorRef.current = editor;
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-muted">
                    <div className="text-center text-muted-foreground">
                      <FileCode className="w-12 h-12 mx-auto mb-4" />
                      <p>Select a file to start editing</p>
                      <p className="text-sm mt-2">Press F1 for keyboard shortcuts</p>
                    </div>
                  </div>
                )}
              </div>
            }
            rightPane={<TerminalComponent />}
            defaultLeftWidth={60}
          />
        </div>
      </div>

      {/* Status Bar */}
      {uiSettings.showStatusBar && (
      <footer className="flex items-center justify-between px-4 py-2 bg-primary text-primary-foreground text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4" />
            <span>main</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span>{openTabs.length} files open</span>
            {activeTab?.hasUnsavedChanges && <span>• Modified</span>}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {editorSettings.autoSaveEnabled && (
            <span>Auto-save: ON</span>
          )}
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </footer>
      )}

      {/* Global Search Dialog */}
      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
        onResultClick={handleSearchResultClick}
      />

      {/* Settings Dialog */}
      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />
      
      {/* Old Settings Dialog - Hidden */}
      {false && (
      <Dialog open={false} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editor Settings</DialogTitle>
            <DialogDescription>
              Customize your development environment.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="editor">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editor" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save">Auto Save</Label>
                <Switch
                  id="auto-save"
                  checked={editorSettings.autoSaveEnabled}
                  onCheckedChange={(checked) =>
                    setEditorSettings(prev => ({ ...prev, autoSaveEnabled: checked }))
                  }
                />
              </div>
              
              {editorSettings.autoSaveEnabled && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-save-delay">Auto Save Delay (ms)</Label>
                  <input
                    id="auto-save-delay"
                    type="number"
                    value={editorSettings.autoSaveDelay}
                    onChange={(e) =>
                      setEditorSettings(prev => ({ ...prev, autoSaveDelay: parseInt(e.target.value) || 2000 }))
                    }
                    className="w-24 px-2 py-1 text-sm border rounded"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label htmlFor="line-numbers">Line Numbers</Label>
                <Switch
                  id="line-numbers"
                  checked={editorSettings.lineNumbersEnabled}
                  onCheckedChange={(checked) =>
                    setEditorSettings(prev => ({ ...prev, lineNumbersEnabled: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="word-wrap">Word Wrap</Label>
                <Switch
                  id="word-wrap"
                  checked={editorSettings.wordWrapEnabled}
                  onCheckedChange={(checked) =>
                    setEditorSettings(prev => ({ ...prev, wordWrapEnabled: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="minimap">Minimap</Label>
                <Switch
                  id="minimap"
                  checked={editorSettings.minimapEnabled}
                  onCheckedChange={(checked) =>
                    setEditorSettings(prev => ({ ...prev, minimapEnabled: checked }))
                  }
                />
              </div>
            </TabsContent>
            
            <TabsContent value="appearance" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size">Font Size</Label>
                <input
                  id="font-size"
                  type="number"
                  value={editorSettings.fontSize}
                  onChange={(e) =>
                    setEditorSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) || 14 }))
                  }
                  min="10"
                  max="24"
                  className="w-20 px-2 py-1 text-sm border rounded"
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      )}

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Quick reference for all available keyboard shortcuts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">File Operations</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Save</span>
                    <kbd className="px-2 py-1 bg-muted rounded">⌘S / Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Close Tab</span>
                    <kbd className="px-2 py-1 bg-muted rounded">⌘W / Ctrl+W</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Editor</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Find</span>
                    <kbd className="px-2 py-1 bg-muted rounded">⌘F / Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Replace</span>
                    <kbd className="px-2 py-1 bg-muted rounded">⌘H / Ctrl+H</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Format Code</span>
                    <kbd className="px-2 py-1 bg-muted rounded">Alt+Shift+F</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Navigation</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Next Tab</span>
                    <kbd className="px-2 py-1 bg-muted rounded">Ctrl+Tab</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Previous Tab</span>
                    <kbd className="px-2 py-1 bg-muted rounded">Ctrl+Shift+Tab</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Global Search</span>
                    <kbd className="px-2 py-1 bg-muted rounded">⌘⇧F / Ctrl+Shift+F</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Help</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Show Shortcuts</span>
                    <kbd className="px-2 py-1 bg-muted rounded">F1</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />

      {/* Templates Catalog */}
      <TemplatesCatalog
        isOpen={showTemplatesCatalog}
        onClose={() => setShowTemplatesCatalog(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* AI Code Assistant */}
      <AICodeAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        selectedCode={selectedCode}
        fileName={activeTab?.file.name}
      />

      {/* Command Palette Trigger Button */}
      <CommandPaletteTrigger />
    </motion.div>
  );
}