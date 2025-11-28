import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileCode, Loader2, Download, Copy, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DockerfileResult {
  content: string;
  explanation: string;
}

interface AIDockerfileGeneratorProps {
  projectPath: string;
  onClose: () => void;
  onSave?: (content: string) => void;
}

export function AIDockerfileGenerator({ projectPath, onClose, onSave }: AIDockerfileGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<DockerfileResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateDockerfile = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/ai/dockerfile', { projectPath });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate Dockerfile');
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Dockerfile');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Dockerfile content has been copied.",
      });
    }
  };

  const handleSave = () => {
    if (result && onSave) {
      onSave(result.content);
      toast({
        title: "Dockerfile saved",
        description: "Dockerfile has been saved to your project.",
      });
      onClose();
    }
  };

  // Auto-generate when component mounts
  useState(() => {
    generateDockerfile();
  });

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            AI Dockerfile Generator
          </DialogTitle>
          <DialogDescription>
            Generating optimized Dockerfile for {projectPath}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          {isGenerating && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Analyzing project and generating Dockerfile...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && !isGenerating && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Generated Dockerfile:</h3>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-md text-sm font-mono overflow-x-auto">
                    {result.content}
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Explanation:</strong> {result.explanation}
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {result && (
            <>
              <Button
                variant="outline"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              {onSave && (
                <Button onClick={handleSave}>
                  <Download className="h-4 w-4 mr-2" />
                  Save to Project
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}