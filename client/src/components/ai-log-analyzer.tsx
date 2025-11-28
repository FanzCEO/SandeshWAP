import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Lightbulb, Terminal, Copy, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LogAnalysis {
  summary: string;
  errors: string[];
  suggestions: string[];
  commands?: string[];
}

interface AILogAnalyzerProps {
  logs: string;
  onClose: () => void;
  onRunCommand?: (command: string) => void;
}

export function AILogAnalyzer({ logs, onClose, onRunCommand }: AILogAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const { toast } = useToast();

  const analyzeLogs = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/ai/logs', { logs });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze logs');
      }
      
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze logs');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
    toast({
      title: "Command copied",
      description: "Command has been copied to clipboard.",
    });
  };

  const handleRunCommand = (command: string) => {
    if (onRunCommand) {
      onRunCommand(command);
      onClose();
    }
  };

  // Auto-analyze when component mounts
  useState(() => {
    analyzeLogs();
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            AI Log Analysis
          </DialogTitle>
          <DialogDescription>
            Analyzing logs to identify issues and suggest fixes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          {isAnalyzing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Analyzing logs and identifying issues...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {analysis && !isAnalyzing && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Summary:</h3>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </div>

              {analysis.errors && analysis.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Errors Detected:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {analysis.errors.map((error, i) => (
                        <li key={i} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {analysis.suggestions && analysis.suggestions.length > 0 && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suggested Fixes:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {analysis.suggestions.map((suggestion, i) => (
                        <li key={i} className="text-sm">{suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {analysis.commands && analysis.commands.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Suggested Commands:
                  </h3>
                  <div className="space-y-2">
                    {analysis.commands.map((command, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <code className="flex-1 bg-muted p-2 rounded text-sm font-mono">
                          {command}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyCommand(command)}
                        >
                          {copiedCommand === command ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {onRunCommand && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRunCommand(command)}
                          >
                            Run
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!isAnalyzing && !analysis && (
            <Button onClick={analyzeLogs}>
              Retry Analysis
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}