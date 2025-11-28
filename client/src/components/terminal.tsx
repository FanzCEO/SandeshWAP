import { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { useTheme } from '@/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import '@xterm/xterm/css/xterm.css';

interface TerminalTab {
  id: string;
  name: string;
  terminal: Terminal;
  socket: WebSocket | null;
  isConnected: boolean;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
}

interface TerminalComponentProps {
  className?: string;
}

export function TerminalComponent({ className }: TerminalComponentProps) {
  const { theme } = useTheme();
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const terminalRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const createTerminalInstance = useCallback(() => {
    const term = new Terminal({
      fontSize: theme.editor?.fontSize || 14,
      fontFamily: theme.editor?.fontFamily || 'JetBrains Mono, Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: theme.terminal?.background || '#0d1117',
        foreground: theme.terminal?.foreground || '#e6edf3',
        cursor: theme.terminal?.cursor || '#7c3aed',
        black: theme.terminal?.black || '#484f58',
        red: theme.terminal?.red || '#ff7b72',
        green: theme.terminal?.green || '#7ee787',
        yellow: theme.terminal?.yellow || '#ffa657',
        blue: theme.terminal?.blue || '#79c0ff',
        magenta: theme.terminal?.magenta || '#d2a8ff',
        cyan: theme.terminal?.cyan || '#39c5cf',
        white: theme.terminal?.white || '#e6edf3',
        brightBlack: theme.terminal?.brightBlack || '#6e7681',
        brightRed: theme.terminal?.brightRed || '#ff7b72',
        brightGreen: theme.terminal?.brightGreen || '#7ee787',
        brightYellow: theme.terminal?.brightYellow || '#ffa657',
        brightBlue: theme.terminal?.brightBlue || '#79c0ff',
        brightMagenta: theme.terminal?.brightMagenta || '#d2a8ff',
        brightCyan: theme.terminal?.brightCyan || '#39c5cf',
        brightWhite: theme.terminal?.brightWhite || '#f0f6fc'
      },
      convertEol: true,
      cursorBlink: true,
      allowTransparency: true,
      scrollback: 50000,
      altClickMovesCursor: true,
      rightClickSelectsWord: true,
      smoothScrollDuration: 120,
      fastScrollModifier: 'alt',
      wordSeparator: ' ()[]{}\'",;'
    });

    // Load advanced addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    const unicode11Addon = new Unicode11Addon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';
    
    return { term, fitAddon, searchAddon };
  }, [theme]);

  const connectWebSocket = useCallback((tabId: string, term: Terminal) => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const createConnection = () => {
      try {
        setConnectionStatus('connecting');
        term.writeln('\r\n\x1b[36m🔌 Establishing secure terminal connection...\x1b[0m');
        
        // Enhanced connection strategies with proper fallback
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        const port = window.location.port;
        
        const connectionUrls = [
          `${protocol}//${window.location.host}/ws/terminal`,
          `${protocol}//${host}:5000/ws/terminal`,
          `ws://127.0.0.1:5000/ws/terminal`,
          `ws://localhost:5000/ws/terminal`
        ];
        
        let currentUrlIndex = 0;
        
        const tryConnection = () => {
          if (currentUrlIndex >= connectionUrls.length) {
            term.writeln('\r\n\x1b[31m🚫 All connection methods failed. Please check your connection.\x1b[0m');
            setConnectionStatus('error');
            return;
          }
          
          const wsUrl = connectionUrls[currentUrlIndex];
          term.writeln(`\r\n\x1b[90m→ Trying ${wsUrl}...\x1b[0m`);
          
          const ws = new WebSocket(wsUrl);
          const connectTimeout = setTimeout(() => {
            ws.close();
            currentUrlIndex++;
            tryConnection();
          }, 3000);

          ws.onopen = () => {
            clearTimeout(connectTimeout);
            setConnectionStatus('connected');
            reconnectAttempts = 0;
            
            term.writeln('\r\n\x1b[32m✨ Terminal connected successfully!\x1b[0m');
            term.writeln('\x1b[90mPress Ctrl+C to interrupt, Ctrl+D to exit\x1b[0m\r\n');
            
            setTabs(prev => prev.map(tab => 
              tab.id === tabId ? { ...tab, socket: ws, isConnected: true } : tab
            ));
          };

          ws.onmessage = (event) => {
            try {
              term.write(event.data);
            } catch (error) {
              console.error('Terminal write error:', error);
              term.writeln('\r\n\x1b[31m⚠ Error displaying terminal output\x1b[0m');
            }
          };

          ws.onclose = (event) => {
            clearTimeout(connectTimeout);
            setConnectionStatus('disconnected');
            
            setTabs(prev => prev.map(tab => 
              tab.id === tabId ? { ...tab, socket: null, isConnected: false } : tab
            ));
            
            if (event.code === 1006) {
              term.writeln('\r\n\x1b[33m📡 Connection lost unexpectedly\x1b[0m');
            } else if (event.code !== 1000) {
              term.writeln(`\r\n\x1b[33m📡 Terminal disconnected (${event.code})\x1b[0m`);
            }
            
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++;
              const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 8000);
              term.writeln(`\r\n\x1b[36m🔄 Reconnecting in ${delay/1000}s... (${reconnectAttempts}/${maxReconnectAttempts})\x1b[0m`);
              
              reconnectTimeout = setTimeout(() => {
                createConnection();
              }, delay);
            } else if (reconnectAttempts >= maxReconnectAttempts) {
              term.writeln('\r\n\x1b[31m🚨 Connection failed - click reconnect to retry\x1b[0m');
            }
          };

          ws.onerror = (error) => {
            clearTimeout(connectTimeout);
            currentUrlIndex++;
            if (currentUrlIndex < connectionUrls.length) {
              tryConnection();
            }
          };

          // Enhanced input handling with better error recovery
          term.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: 'input', data }));
              } catch (error) {
                console.error('WebSocket send error:', error);
                term.writeln('\r\n\x1b[31m⚠ Failed to send input\x1b[0m');
              }
            }
          });

          // Smart terminal resize handling
          const handleResize = () => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({
                  type: 'resize',
                  cols: term.cols,
                  rows: term.rows
                }));
              } catch (error) {
                console.error('Resize error:', error);
              }
            }
          };

          window.addEventListener('resize', handleResize);
          
          return () => {
            window.removeEventListener('resize', handleResize);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1000, 'Tab closed');
            }
          };
        };
        
        tryConnection();
      } catch (error) {
        console.error('Connection creation error:', error);
        term.writeln('\r\n\x1b[31m🚨 Fatal connection error\x1b[0m');
        setConnectionStatus('error');
      }
    };
    
    createConnection();
  }, []);

  const createNewTab = useCallback(() => {
    const tabId = `tab-${Date.now()}`;
    const { term, fitAddon, searchAddon } = createTerminalInstance();
    
    const newTab: TerminalTab = {
      id: tabId,
      name: `Terminal ${tabs.length + 1}`,
      terminal: term,
      socket: null,
      isConnected: false,
      fitAddon,
      searchAddon
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTab(tabId);
    
    setTimeout(() => {
      const terminalEl = terminalRefs.current.get(tabId);
      if (terminalEl) {
        term.open(terminalEl);
        fitAddon.fit();
        connectWebSocket(tabId, term);
        
        // Focus the terminal
        term.focus();
        
        // Add welcome message
        term.writeln('\x1b[95m╔══════════════════════════════════════════════╗\x1b[0m');
        term.writeln('\x1b[95m║\x1b[0m        \x1b[1m\x1b[96mSandesh WAP Terminal v2.0\x1b[0m            \x1b[95m║\x1b[0m');
        term.writeln('\x1b[95m║\x1b[0m     \x1b[90mState-of-the-art development terminal\x1b[0m     \x1b[95m║\x1b[0m');
        term.writeln('\x1b[95m╚══════════════════════════════════════════════╝\x1b[0m');
      }
    }, 100);
    
    return newTab;
  }, [tabs.length, createTerminalInstance, connectWebSocket]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabToClose = prev.find(tab => tab.id === tabId);
      if (tabToClose) {
        if (tabToClose.socket?.readyState === WebSocket.OPEN) {
          tabToClose.socket.close(1000, 'Tab closed');
        }
        tabToClose.terminal.dispose();
        terminalRefs.current.delete(tabId);
      }
      
      const remaining = prev.filter(tab => tab.id !== tabId);
      
      if (remaining.length === 0) {
        setTimeout(() => createNewTab(), 0);
      } else if (activeTab === tabId) {
        setActiveTab(remaining[remaining.length - 1].id);
      }
      
      return remaining;
    });
  }, [activeTab, createNewTab]);

  // Initialize with first tab
  useEffect(() => {
    if (tabs.length === 0) {
      createNewTab();
    }
  }, [tabs.length, createNewTab]);

  const setTerminalRef = useCallback((tabId: string, el: HTMLDivElement | null) => {
    if (el) {
      terminalRefs.current.set(tabId, el);
    } else {
      terminalRefs.current.delete(tabId);
    }
  }, []);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-emerald-500 shadow-emerald-500/50';
      case 'connecting': return 'bg-amber-500 shadow-amber-500/50 animate-pulse';
      case 'error': return 'bg-red-500 shadow-red-500/50';
      default: return 'bg-slate-500 shadow-slate-500/50';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Online';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Error';
      default: return 'Offline';
    }
  };

  const reconnectActiveTab = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (activeTabData) {
      connectWebSocket(activeTab, activeTabData.terminal);
    }
  };

  return (
    <Card className={`h-full ${className} bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl border-border/40 shadow-2xl`}>
      <CardContent className="h-full p-0">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 border-b border-border/40 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <i className="fas fa-terminal text-primary text-xl drop-shadow-sm"></i>
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background shadow-lg ${getConnectionStatusColor()}`}></div>
              </div>
              <div>
                <span className="text-sm font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Advanced Terminal
                </span>
                <div className="text-xs text-muted-foreground">
                  Multi-tab • Enhanced Features • Smart Reconnection
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-medium border-primary/30 bg-primary/5">
              {getConnectionStatusText()}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {connectionStatus === 'error' && (
              <Button 
                size="sm"
                variant="outline" 
                className="h-8 px-3 text-xs border-amber-500/50 hover:bg-amber-500/10"
                onClick={reconnectActiveTab}
                title="Reconnect Terminal"
              >
                <i className="fas fa-sync-alt mr-2 text-amber-500"></i>
                Reconnect
              </Button>
            )}
            <Button 
              size="sm"
              variant="ghost" 
              className="h-8 w-8 p-0 hover:bg-primary/10"
              onClick={createNewTab}
              title="New Terminal Tab"
            >
              <i className="fas fa-plus text-primary text-sm"></i>
            </Button>
            <Button 
              size="sm"
              variant="ghost" 
              className="h-8 w-8 p-0 hover:bg-blue-500/10"
              onClick={() => {
                const activeTabData = tabs.find(tab => tab.id === activeTab);
                activeTabData?.terminal?.clear();
              }}
              title="Clear Terminal"
            >
              <i className="fas fa-broom text-blue-500 text-sm"></i>
            </Button>
          </div>
        </div>
        
        {/* Multi-Tab Terminal Interface */}
        {tabs.length > 0 && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {tabs.length > 1 && (
              <TabsList className="w-full justify-start bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 border-b border-border/30 rounded-none px-3 py-2">
                {tabs.map((tab, index) => (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="relative group data-[state=active]:bg-background/80 data-[state=active]:shadow-lg data-[state=active]:border-primary/30 transition-all duration-200 hover:bg-background/60"
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        tab.isConnected 
                          ? 'bg-emerald-400 shadow-emerald-400/50' 
                          : 'bg-red-400 shadow-red-400/50'
                      } ${tab.isConnected ? 'animate-pulse' : ''}`}>
                      </div>
                      <span className="text-xs font-medium">{tab.name}</span>
                      <div className="text-xs text-muted-foreground">#{index + 1}</div>
                    </div>
                    <button
                      className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      title="Close tab"
                    >
                      <i className="fas fa-times text-xs"></i>
                    </button>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}
            
            <div className="flex-1 relative overflow-hidden">
              {tabs.map((tab) => (
                <TabsContent 
                  key={tab.id} 
                  value={tab.id} 
                  className="h-full m-0 data-[state=active]:block hidden"
                >
                  <div 
                    ref={(el) => setTerminalRef(tab.id, el)}
                    className="h-full p-3 font-mono text-sm selection:bg-primary/20"
                    style={{ 
                      backgroundColor: theme.terminal?.background || '#0d1117',
                      minHeight: '400px'
                    }}
                    data-testid={`terminal-container-${tab.id}`}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}