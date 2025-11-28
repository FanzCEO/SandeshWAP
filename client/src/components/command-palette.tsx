import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  category: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void | Promise<void>;
  context?: 'always' | 'file-open' | 'project-loaded';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Fuzzy search implementation
  const fuzzyMatch = useCallback((text: string, query: string): { score: number; matches: number[] } => {
    if (!query) return { score: 1, matches: [] };
    
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const matches: number[] = [];
    
    let queryIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        matches.push(i);
        queryIndex++;
        consecutiveMatches++;
        score += consecutiveMatches * 2; // Bonus for consecutive matches
      } else {
        consecutiveMatches = 0;
      }
    }
    
    // Return 0 score if not all query characters were found
    if (queryIndex !== queryLower.length) {
      return { score: 0, matches: [] };
    }
    
    // Boost score for matches at word boundaries
    matches.forEach((pos, idx) => {
      if (pos === 0 || textLower[pos - 1] === ' ' || textLower[pos - 1] === '-') {
        score += 5;
      }
    });
    
    // Prefer shorter matches
    score = score / (text.length * 0.1 + 1);
    
    return { score, matches };
  }, []);

  // Filter and sort commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first when no query
      const recent = commands.filter(cmd => recentCommands.includes(cmd.id));
      const others = commands.filter(cmd => !recentCommands.includes(cmd.id));
      return [...recent, ...others].slice(0, 50).map(command => ({
        command,
        score: 1,
        titleMatches: [],
        subtitleMatches: []
      }));
    }

    const results = commands
      .map(command => {
        const titleMatch = fuzzyMatch(command.title, query);
        const subtitleMatch = command.subtitle ? fuzzyMatch(command.subtitle, query) : { score: 0, matches: [] };
        const keywordMatch = command.keywords 
          ? Math.max(...command.keywords.map(k => fuzzyMatch(k, query).score))
          : 0;
        
        const maxScore = Math.max(titleMatch.score, subtitleMatch.score, keywordMatch);
        
        return {
          command,
          score: maxScore,
          titleMatches: titleMatch.matches,
          subtitleMatches: subtitleMatch.matches
        };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => {
        // Prioritize recent commands
        const aIsRecent = recentCommands.includes(a.command.id);
        const bIsRecent = recentCommands.includes(b.command.id);
        
        if (aIsRecent && !bIsRecent) return -1;
        if (!aIsRecent && bIsRecent) return 1;
        
        return b.score - a.score;
      })
      .slice(0, 20);

    return results;
  }, [commands, query, recentCommands, fuzzyMatch]);

  // Execute selected command
  const executeCommand = useCallback(async (command: Command) => {
    try {
      await command.action();
      
      // Add to recent commands
      setRecentCommands(prev => {
        const filtered = prev.filter(id => id !== command.id);
        return [command.id, ...filtered].slice(0, 10);
      });
      
      onClose();
      setQuery('');
      setSelectedIndex(0);
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? filteredCommands.length - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex].command);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, executeCommand, onClose]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Clear query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Highlight matched characters
  const highlightMatches = (text: string, matches: number[]) => {
    if (matches.length === 0) return text;
    
    const result = [];
    let lastIndex = 0;
    
    matches.forEach(matchIndex => {
      if (matchIndex > lastIndex) {
        result.push(text.slice(lastIndex, matchIndex));
      }
      result.push(
        <span key={matchIndex} className="bg-primary/30 text-primary font-semibold rounded px-0.5">
          {text[matchIndex]}
        </span>
      );
      lastIndex = matchIndex + 1;
    });
    
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }
    
    return result;
  };

  const groupedCommands = useMemo(() => {
    const groups: Record<string, typeof filteredCommands> = {};
    
    filteredCommands.forEach(item => {
      const category = item.command.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    
    return groups;
  }, [filteredCommands]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl">
        <div className="flex flex-col h-96">
          {/* Header */}
          <div className="p-4 border-b border-border/40 bg-gradient-to-r from-muted/20 to-muted/10">
            <div className="flex items-center space-x-3 mb-3">
              <i className="fas fa-terminal text-primary text-lg"></i>
              <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Command Palette
              </span>
              <Badge variant="outline" className="text-xs">
                {filteredCommands.length} commands
              </Badge>
            </div>
            
            <Input
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-background/60 backdrop-blur-sm border-border/60 focus:border-primary/60 transition-all duration-200"
              autoFocus
              data-testid="command-palette-input"
            />
          </div>

          {/* Commands List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {Object.keys(groupedCommands).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <i className="fas fa-search text-3xl mb-3 opacity-50"></i>
                  <p className="text-sm">No commands found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <div className="flex items-center space-x-2 px-3 py-1 mb-2">
                      <div className="h-px flex-1 bg-border/40"></div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {category}
                      </span>
                      <div className="h-px flex-1 bg-border/40"></div>
                    </div>
                    
                    {items.map((item, globalIndex) => {
                      const commandIndex = filteredCommands.indexOf(item);
                      const isSelected = commandIndex === selectedIndex;
                      
                      return (
                        <Button
                          key={item.command.id}
                          variant="ghost"
                          className={`w-full justify-start h-auto p-3 mb-1 ${
                            isSelected 
                              ? 'bg-primary/10 border-primary/30 shadow-sm' 
                              : 'hover:bg-muted/60'
                          } transition-all duration-150`}
                          onClick={() => executeCommand(item.command)}
                          data-testid={`command-item-${item.command.id}`}
                        >
                          <div className="flex items-center space-x-3 w-full">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                              isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            } transition-colors duration-150`}>
                              <i className={`${item.command.icon} text-sm`}></i>
                            </div>
                            
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium">
                                {highlightMatches(item.command.title, item.titleMatches)}
                              </div>
                              {item.command.subtitle && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {highlightMatches(item.command.subtitle, item.subtitleMatches)}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {recentCommands.includes(item.command.id) && (
                                <Badge variant="secondary" className="text-xs px-2 py-0">
                                  Recent
                                </Badge>
                              )}
                              {item.command.shortcut && (
                                <kbd className="px-2 py-1 text-xs bg-muted/60 border border-border/40 rounded">
                                  {item.command.shortcut}
                                </kbd>
                              )}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t border-border/40 bg-muted/10">
            <div className="flex justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span><kbd className="px-1.5 py-0.5 bg-muted/60 border rounded text-xs">↑↓</kbd> navigate</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted/60 border rounded text-xs">⏎</kbd> execute</span>
                <span><kbd className="px-1.5 py-0.5 bg-muted/60 border rounded text-xs">esc</kbd> close</span>
              </div>
              <div className="flex items-center space-x-1">
                <i className="fas fa-keyboard text-xs"></i>
                <span>Press <kbd className="px-1.5 py-0.5 bg-muted/60 border rounded text-xs">Ctrl+Shift+P</kbd> anytime</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}