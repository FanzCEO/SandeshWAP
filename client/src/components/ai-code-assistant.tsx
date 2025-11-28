import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCode?: string;
  fileName?: string;
}

interface AIResponse {
  type: 'explanation' | 'suggestion' | 'refactor' | 'documentation' | 'optimization';
  title: string;
  content: string;
  code?: string;
  confidence: number;
}

export function AICodeAssistant({ isOpen, onClose, selectedCode, fileName }: AIAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [activeTab, setActiveTab] = useState('assistant');
  const [userInput, setUserInput] = useState('');
  const abortController = useRef<AbortController | null>(null);

  // Simulate AI analysis
  const analyzeCode = useCallback(async (code: string, prompt?: string) => {
    if (abortController.current) {
      abortController.current.abort();
    }
    
    abortController.current = new AbortController();
    setIsLoading(true);
    setResponses([]);

    try {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock AI responses based on code analysis
      const mockResponses: AIResponse[] = [
        {
          type: 'explanation',
          title: 'Code Analysis',
          content: `This code snippet appears to be a ${fileName ? getFileTypeDescription(fileName) : 'JavaScript/TypeScript'} function. It demonstrates good practices with proper error handling and clean structure. The logic flow is well-organized and follows modern development patterns.`,
          confidence: 0.92
        },
        {
          type: 'suggestion',
          title: 'Performance Optimization',
          content: 'Consider using memoization for expensive calculations. You could implement useMemo or useCallback hooks to prevent unnecessary re-renders and improve performance.',
          code: `// Optimized version
const memoizedResult = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);`,
          confidence: 0.87
        },
        {
          type: 'refactor',
          title: 'Code Improvement',
          content: 'The code can be refactored to be more modular and reusable. Consider extracting utility functions and using modern ES6+ features.',
          code: `// Refactored version
const processData = (items) => items
  .filter(item => item.isActive)
  .map(item => ({ ...item, processed: true }));`,
          confidence: 0.89
        },
        {
          type: 'documentation',
          title: 'Generated Documentation',
          content: 'Here\'s comprehensive documentation for your code:',
          code: `/**
 * Processes user data and applies transformations
 * @param {Array} data - Input data array
 * @param {Object} options - Processing options
 * @returns {Array} Processed data array
 */
function processUserData(data, options = {}) {
  // Implementation here
}`,
          confidence: 0.94
        }
      ];

      if (prompt) {
        mockResponses.unshift({
          type: 'explanation',
          title: 'AI Response',
          content: `Based on your question: "${prompt}", here's my analysis and recommendations for your code. The implementation looks solid and follows best practices. I've identified several areas where we could enhance the functionality.`,
          confidence: 0.91
        });
      }

      setResponses(mockResponses);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('AI analysis error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fileName]);

  // Auto-analyze when code is selected
  useEffect(() => {
    if (isOpen && selectedCode && selectedCode.trim().length > 10) {
      analyzeCode(selectedCode);
    }
  }, [isOpen, selectedCode, analyzeCode]);

  const getFileTypeDescription = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TypeScript',
      'py': 'Python',
      'css': 'CSS',
      'html': 'HTML',
      'json': 'JSON',
      'md': 'Markdown'
    };
    return typeMap[ext || ''] || 'code';
  };

  const handleUserQuestion = async () => {
    if (!userInput.trim()) return;
    
    await analyzeCode(selectedCode || '', userInput);
    setUserInput('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-500 bg-green-100 dark:bg-green-900/20';
    if (confidence >= 0.8) return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
    if (confidence >= 0.7) return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
    return 'text-orange-500 bg-orange-100 dark:bg-orange-900/20';
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'explanation': 'fas fa-info-circle',
      'suggestion': 'fas fa-lightbulb',
      'refactor': 'fas fa-code',
      'documentation': 'fas fa-file-alt',
      'optimization': 'fas fa-rocket'
    };
    return iconMap[type] || 'fas fa-brain';
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed top-4 right-4 w-96 h-[600px] bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl z-40 animate-in slide-in-from-right-5 fade-in-0 duration-300">
      <CardHeader className="pb-3 bg-gradient-to-r from-muted/20 to-muted/10 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
              <i className="fas fa-robot text-primary text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                AI Code Assistant
              </h3>
              <p className="text-xs text-muted-foreground">
                Intelligent code analysis & suggestions
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <i className="fas fa-times text-sm"></i>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="w-full justify-start bg-transparent border-b border-border/30 rounded-none px-3">
            <TabsTrigger value="assistant" className="text-xs">
              <i className="fas fa-brain mr-2"></i>
              Analysis
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs">
              <i className="fas fa-comment mr-2"></i>
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="flex-1 m-0">
            <ScrollArea className="h-full px-4">
              <div className="py-4 space-y-4">
                {selectedCode && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                      <i className="fas fa-code mr-2"></i>
                      Selected Code ({fileName || 'untitled'})
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 text-xs font-mono max-h-20 overflow-auto">
                      {selectedCode.length > 100 ? `${selectedCode.substring(0, 100)}...` : selectedCode}
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <div className="text-sm text-muted-foreground text-center">
                      <div className="font-medium">Analyzing your code...</div>
                      <div className="text-xs mt-1">AI is processing the patterns</div>
                    </div>
                  </div>
                ) : responses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <i className="fas fa-code text-3xl mb-3 opacity-50"></i>
                    <div className="text-sm text-center">
                      <div className="font-medium mb-1">Select code to analyze</div>
                      <div className="text-xs">Highlight any code snippet to get AI insights</div>
                    </div>
                  </div>
                ) : (
                  responses.map((response, index) => (
                    <Card key={index} className="bg-gradient-to-r from-muted/10 to-muted/5 border-border/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <i className={`${getTypeIcon(response.type)} text-primary text-sm`}></i>
                            <span className="text-sm font-medium">{response.title}</span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-0 ${getConfidenceColor(response.confidence)}`}
                          >
                            {Math.round(response.confidence * 100)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-xs text-muted-foreground mb-3">
                          {response.content}
                        </p>
                        {response.code && (
                          <div className="relative">
                            <pre className="bg-background/60 border border-border/30 rounded p-3 text-xs font-mono overflow-x-auto">
                              {response.code}
                            </pre>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="absolute top-2 right-2 h-6 w-6 p-0"
                              onClick={() => copyToClipboard(response.code!)}
                            >
                              <i className="fas fa-copy text-xs"></i>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 m-0 flex flex-col">
            <div className="flex-1 px-4 py-4">
              <div className="space-y-3 h-full">
                <div className="text-xs font-medium text-muted-foreground mb-3">
                  Ask questions about your code
                </div>
                
                <div className="space-y-2">
                  <Textarea
                    placeholder="Ask me anything about your code..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="min-h-[80px] text-xs"
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    onClick={handleUserQuestion}
                    disabled={!userInput.trim() || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane mr-2"></i>
                        Ask AI
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/30">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setUserInput("Explain this code")}
                    >
                      <i className="fas fa-question-circle mr-2"></i>
                      Explain
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setUserInput("How can I optimize this?")}
                    >
                      <i className="fas fa-rocket mr-2"></i>
                      Optimize
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setUserInput("Find bugs or issues")}
                    >
                      <i className="fas fa-bug mr-2"></i>
                      Debug
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => setUserInput("Add documentation")}
                    >
                      <i className="fas fa-file-alt mr-2"></i>
                      Document
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}