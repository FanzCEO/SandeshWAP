import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CommandPalette, Command } from '@/components/command-palette';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CommandContextType {
  isOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  registerCommands: (commands: Command[]) => void;
  executeCommand: (commandId: string) => Promise<void>;
  // AI Assistant controls
  openAIAssistant?: () => void;
  setAIAssistantData?: (selectedCode: string, fileName?: string) => void;
}

const CommandContext = createContext<CommandContextType | null>(null);

export function useCommands() {
  const context = useContext(CommandContext);
  if (!context) {
    throw new Error('useCommands must be used within a CommandProvider');
  }
  return context;
}

interface CommandProviderProps {
  children: ReactNode;
}

export function CommandProvider({ children }: CommandProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({ queryKey: ['/api/project'] });
  const { data: files } = useQuery({ queryKey: ['/api/files', (project as any)?.path || ''] });

  // Core application commands
  const coreCommands: Command[] = [
    // File Operations
    {
      id: 'file.new',
      title: 'New File',
      subtitle: 'Create a new file in the current directory',
      icon: 'fas fa-file-plus',
      category: 'File',
      keywords: ['create', 'add', 'file'],
      shortcut: 'Ctrl+N',
      action: async () => {
        const fileName = prompt('Enter file name:');
        if (fileName) {
          await apiRequest(`/api/files${(project as any)?.path || ''}/${fileName}`, 'PUT', { content: '' });
          queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        }
      }
    },
    {
      id: 'file.new-folder',
      title: 'New Folder',
      subtitle: 'Create a new folder in the current directory',
      icon: 'fas fa-folder-plus',
      category: 'File',
      keywords: ['create', 'add', 'folder', 'directory'],
      shortcut: 'Ctrl+Shift+N',
      action: async () => {
        const folderName = prompt('Enter folder name:');
        if (folderName) {
          await apiRequest(`/api/files${(project as any)?.path || ''}/${folderName}/`, 'PUT', { content: '' });
          queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        }
      }
    },
    {
      id: 'file.save-all',
      title: 'Save All Files',
      subtitle: 'Save all modified files',
      icon: 'fas fa-save',
      category: 'File',
      keywords: ['save', 'all'],
      shortcut: 'Ctrl+Shift+S',
      action: async () => {
        // Trigger save all logic
        console.log('Save all files');
      }
    },

    // Editor Commands
    {
      id: 'editor.format',
      title: 'Format Document',
      subtitle: 'Format the current document',
      icon: 'fas fa-magic',
      category: 'Editor',
      keywords: ['format', 'prettier', 'beautify'],
      shortcut: 'Shift+Alt+F',
      action: async () => {
        console.log('Format document');
      }
    },
    {
      id: 'editor.find',
      title: 'Find in Files',
      subtitle: 'Search for text across all project files',
      icon: 'fas fa-search',
      category: 'Editor',
      keywords: ['find', 'search', 'grep'],
      shortcut: 'Ctrl+Shift+F',
      action: async () => {
        console.log('Find in files');
      }
    },
    {
      id: 'editor.replace',
      title: 'Replace in Files',
      subtitle: 'Find and replace text across all project files',
      icon: 'fas fa-exchange-alt',
      category: 'Editor',
      keywords: ['replace', 'substitute', 'change'],
      shortcut: 'Ctrl+Shift+H',
      action: async () => {
        console.log('Replace in files');
      }
    },

    // Terminal Commands
    {
      id: 'terminal.new',
      title: 'New Terminal',
      subtitle: 'Open a new terminal tab',
      icon: 'fas fa-terminal',
      category: 'Terminal',
      keywords: ['terminal', 'shell', 'command'],
      shortcut: 'Ctrl+Shift+`',
      action: async () => {
        // This will be connected to the terminal component
        console.log('New terminal');
      }
    },
    {
      id: 'terminal.clear',
      title: 'Clear Terminal',
      subtitle: 'Clear the active terminal',
      icon: 'fas fa-broom',
      category: 'Terminal',
      keywords: ['clear', 'clean'],
      action: async () => {
        console.log('Clear terminal');
      }
    },

    // Project Commands
    {
      id: 'project.reload',
      title: 'Reload Project',
      subtitle: 'Refresh the project file tree',
      icon: 'fas fa-sync',
      category: 'Project',
      keywords: ['reload', 'refresh', 'sync'],
      shortcut: 'F5',
      action: async () => {
        queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        queryClient.invalidateQueries({ queryKey: ['/api/project'] });
      }
    },
    {
      id: 'project.templates',
      title: 'Browse Templates',
      subtitle: 'Explore available project templates',
      icon: 'fas fa-layer-group',
      category: 'Project',
      keywords: ['templates', 'starters', 'boilerplate'],
      action: async () => {
        console.log('Browse templates');
      }
    },

    // AI Commands
    {
      id: 'ai.analyze-code',
      title: 'AI Code Analysis',
      subtitle: 'Get AI insights about your code',
      icon: 'fas fa-brain',
      category: 'AI Assistant',
      keywords: ['ai', 'analysis', 'review', 'insights'],
      action: async () => {
        console.log('AI code analysis');
      }
    },
    {
      id: 'ai.generate-docs',
      title: 'Generate Documentation',
      subtitle: 'AI-powered documentation generation',
      icon: 'fas fa-file-alt',
      category: 'AI Assistant',
      keywords: ['documentation', 'docs', 'generate'],
      action: async () => {
        console.log('Generate documentation');
      }
    },
    {
      id: 'ai.optimize-code',
      title: 'Optimize Code',
      subtitle: 'AI suggestions for code optimization',
      icon: 'fas fa-rocket',
      category: 'AI Assistant',
      keywords: ['optimize', 'improve', 'performance'],
      action: async () => {
        console.log('Optimize code');
      }
    },

    // Git Commands
    {
      id: 'git.status',
      title: 'Git Status',
      subtitle: 'Show git repository status',
      icon: 'fab fa-git-alt',
      category: 'Source Control',
      keywords: ['git', 'status', 'changes'],
      action: async () => {
        console.log('Git status');
      }
    },
    {
      id: 'git.commit',
      title: 'Git Commit',
      subtitle: 'Commit changes to repository',
      icon: 'fas fa-check',
      category: 'Source Control',
      keywords: ['git', 'commit', 'save'],
      shortcut: 'Ctrl+Enter',
      action: async () => {
        const message = prompt('Enter commit message:');
        if (message) {
          console.log('Git commit:', message);
        }
      }
    },

    // Utilities
    {
      id: 'util.color-picker',
      title: 'Color Picker',
      subtitle: 'Open color picker tool',
      icon: 'fas fa-palette',
      category: 'Utilities',
      keywords: ['color', 'picker', 'palette'],
      action: async () => {
        console.log('Color picker');
      }
    },
    {
      id: 'util.lorem-ipsum',
      title: 'Generate Lorem Ipsum',
      subtitle: 'Insert placeholder text',
      icon: 'fas fa-paragraph',
      category: 'Utilities',
      keywords: ['lorem', 'ipsum', 'placeholder', 'text'],
      action: async () => {
        console.log('Generate lorem ipsum');
      }
    },

    // Settings
    {
      id: 'settings.preferences',
      title: 'Open Settings',
      subtitle: 'Customize your development environment',
      icon: 'fas fa-cog',
      category: 'Settings',
      keywords: ['settings', 'preferences', 'config'],
      shortcut: 'Ctrl+,',
      action: async () => {
        console.log('Open settings');
      }
    },
    {
      id: 'settings.shortcuts',
      title: 'Keyboard Shortcuts',
      subtitle: 'View and customize keyboard shortcuts',
      icon: 'fas fa-keyboard',
      category: 'Settings',
      keywords: ['shortcuts', 'hotkeys', 'keyboard'],
      shortcut: 'Ctrl+K Ctrl+S',
      action: async () => {
        console.log('Keyboard shortcuts');
      }
    },

    // Help
    {
      id: 'help.welcome',
      title: 'Welcome Guide',
      subtitle: 'Get started with Sandesh WAP',
      icon: 'fas fa-graduation-cap',
      category: 'Help',
      keywords: ['help', 'welcome', 'tutorial', 'guide'],
      action: async () => {
        console.log('Welcome guide');
      }
    },
    {
      id: 'help.docs',
      title: 'Documentation',
      subtitle: 'View comprehensive documentation',
      icon: 'fas fa-book',
      category: 'Help',
      keywords: ['docs', 'documentation', 'manual'],
      shortcut: 'F1',
      action: async () => {
        window.open('https://docs.sandesh-wap.com', '_blank');
      }
    }
  ];

  // Initialize commands
  useEffect(() => {
    setCommands(coreCommands);
  }, [project, files]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      // Quick commands
      if (e.ctrlKey && e.altKey && e.key === 'T') {
        e.preventDefault();
        // New terminal command
        const newTerminalCmd = commands.find(cmd => cmd.id === 'terminal.new');
        if (newTerminalCmd) newTerminalCmd.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commands]);

  const openCommandPalette = () => setIsOpen(true);
  const closeCommandPalette = () => setIsOpen(false);

  const registerCommands = (newCommands: Command[]) => {
    setCommands(prev => [...prev, ...newCommands]);
  };

  const executeCommand = async (commandId: string) => {
    const command = commands.find(cmd => cmd.id === commandId);
    if (command) {
      await command.action();
    }
  };

  const contextValue: CommandContextType = {
    isOpen,
    openCommandPalette,
    closeCommandPalette,
    registerCommands,
    executeCommand
  };

  return (
    <CommandContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        isOpen={isOpen}
        onClose={closeCommandPalette}
        commands={commands}
      />
    </CommandContext.Provider>
  );
}