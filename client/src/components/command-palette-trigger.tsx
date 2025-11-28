import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useCommands } from '@/providers/command-provider';
import { Badge } from '@/components/ui/badge';

export function CommandPaletteTrigger() {
  const { openCommandPalette } = useCommands();
  const [showHint, setShowHint] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Show hint for new users
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('commandPaletteHintSeen');
    if (!hasSeenHint) {
      const timer = setTimeout(() => {
        setShowHint(true);
        // Auto-hide hint after 8 seconds
        setTimeout(() => {
          setShowHint(false);
          localStorage.setItem('commandPaletteHintSeen', 'true');
        }, 8000);
      }, 3000); // Show hint after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Keyboard shortcut detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        setIsVisible(false);
        setTimeout(() => setIsVisible(true), 300); // Brief hide for visual feedback
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      <div className="relative">
        <Button
          size="lg"
          onClick={openCommandPalette}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-xl hover:shadow-2xl border-2 border-primary/20 backdrop-blur-sm transition-all duration-300 hover:scale-110 group"
          data-testid="command-palette-trigger"
        >
          <div className="relative">
            <i className="fas fa-magic text-lg group-hover:rotate-12 transition-transform duration-300"></i>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
        </Button>

        {/* Floating Hint Bubble */}
        {showHint && (
          <div className="absolute bottom-full right-0 mb-4 animate-in slide-in-from-bottom-2 fade-in-0 duration-500">
            <div className="relative bg-gradient-to-r from-background/95 via-background/90 to-background/95 backdrop-blur-xl border border-border/40 rounded-xl p-4 shadow-2xl max-w-xs">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 text-primary">
                  <i className="fas fa-keyboard text-sm"></i>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1">Command Palette</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Quick access to all features
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Ctrl+Shift+P
                  </Badge>
                </div>
              </div>
              
              {/* Arrow pointing to the button */}
              <div className="absolute top-full right-6 -mt-1">
                <div className="w-3 h-3 bg-background/95 border-r border-b border-border/40 rotate-45"></div>
              </div>
              
              {/* Close button */}
              <button
                onClick={() => {
                  setShowHint(false);
                  localStorage.setItem('commandPaletteHintSeen', 'true');
                }}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        )}

        {/* Ripple Effect */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
        
        {/* Keyboard Shortcut Indicator */}
        <div className="absolute -top-2 -left-2 bg-gradient-to-r from-background via-background/90 to-background/80 backdrop-blur-sm border border-border/40 rounded-lg px-2 py-1">
          <span className="text-xs font-mono text-muted-foreground">
            ⌘⇧P
          </span>
        </div>
      </div>
    </div>
  );
}