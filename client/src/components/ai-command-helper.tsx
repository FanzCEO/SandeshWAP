import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, AlertTriangle, Lightbulb, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CommandExplanation {
  command: string;
  explanation: string;
  risks: string[];
  suggestions?: string[];
}

interface AICommandHelperProps {
  command: string;
  onExecute: () => void;
  onCancel: () => void;
}

export function AICommandHelper({ command, onExecute, onCancel }: AICommandHelperProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explanation, setExplanation] = useState<CommandExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeCommand = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/ai/dryrun', { command });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze command');
      }
      
      setExplanation(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze command');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when component mounts
  useState(() => {
    if (command) {
      analyzeCommand();
    }
  });

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Command Analysis
          </DialogTitle>
          <DialogDescription>
            Understanding what this command will do before execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md font-mono text-sm">
            {command}
          </div>

          {isAnalyzing && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Analyzing command...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {explanation && !isAnalyzing && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">What this command does:</h3>
                <p className="text-sm text-muted-foreground">{explanation.explanation}</p>
              </div>

              {explanation.risks && explanation.risks.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Potential Risks:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {explanation.risks.map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {explanation.suggestions && explanation.suggestions.length > 0 && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suggestions:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {explanation.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onExecute}
            disabled={isAnalyzing}
            className="bg-primary"
          >
            Execute Command
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}