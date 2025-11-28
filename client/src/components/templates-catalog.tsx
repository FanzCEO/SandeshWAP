import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/loading-spinner';
import { 
  Rocket, Code, Zap, Package, Terminal, GitBranch, 
  FolderPlus, ArrowRight, Check, Clock, Server,
  FileCode, Database, Globe, Layers, Brain, Smartphone,
  Monitor, Wrench, Bot, DatabaseZap
} from 'lucide-react';
import type { ProjectTemplate, CreateProjectFromTemplateResponse } from '@shared/schema';

interface TemplatesCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectPath: string, projectName: string) => void;
}

const categoryIcons = {
  backend: <Server className="w-5 h-5" />,
  frontend: <Globe className="w-5 h-5" />,
  fullstack: <Layers className="w-5 h-5" />,
  ai: <Brain className="w-5 h-5" />,
  mobile: <Smartphone className="w-5 h-5" />,
  desktop: <Monitor className="w-5 h-5" />,
  devops: <Wrench className="w-5 h-5" />,
  bots: <Bot className="w-5 h-5" />,
  database: <DatabaseZap className="w-5 h-5" />
};

const categoryColors = {
  backend: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  frontend: 'bg-green-500/10 text-green-600 dark:text-green-400',
  fullstack: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  ai: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  mobile: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  desktop: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  devops: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  bots: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  database: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
};

export function TemplatesCatalog({ isOpen, onClose, onProjectCreated }: TemplatesCatalogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'backend' | 'frontend' | 'fullstack' | 'ai' | 'mobile' | 'desktop' | 'devops' | 'bots' | 'database'>('all');
  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery<ProjectTemplate[]>({
    queryKey: ['/api/templates'],
    enabled: isOpen,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !projectName) {
        throw new Error('Template and project name are required');
      }

      const response = await apiRequest('POST', '/api/project/create-from-template', {
        templateId: selectedTemplate.id,
        projectName: projectName.trim()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      return response.json() as Promise<CreateProjectFromTemplateResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Project created successfully!",
        description: `Your project "${data.projectName}" has been created.`,
        duration: 5000,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/project'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });

      // Call callback if provided
      if (onProjectCreated) {
        onProjectCreated(data.projectPath, data.projectName);
      }

      // Reset and close
      setSelectedTemplate(null);
      setProjectName('');
      setShowConfirmDialog(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName(template.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    setShowConfirmDialog(true);
  };

  const handleCreateProject = () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate();
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FolderPlus className="w-6 h-6 text-primary" />
              Create New Project
            </DialogTitle>
            <DialogDescription>
              Choose a template to start your new project
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-destructive">
                <p>Failed to load templates</p>
              </div>
            ) : (
              <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)} className="h-full">
                <div className="mb-4">
                  <TabsList className="grid w-full grid-cols-5 mb-2">
                    <TabsTrigger value="all" data-testid="tab-all">
                      <Package className="w-4 h-4 mr-2" />
                      All
                    </TabsTrigger>
                    <TabsTrigger value="backend" data-testid="tab-backend">
                      <Server className="w-4 h-4 mr-2" />
                      Backend
                    </TabsTrigger>
                    <TabsTrigger value="frontend" data-testid="tab-frontend">
                      <Globe className="w-4 h-4 mr-2" />
                      Frontend
                    </TabsTrigger>
                    <TabsTrigger value="fullstack" data-testid="tab-fullstack">
                      <Layers className="w-4 h-4 mr-2" />
                      Full Stack
                    </TabsTrigger>
                    <TabsTrigger value="ai" data-testid="tab-ai">
                      <Brain className="w-4 h-4 mr-2" />
                      AI
                    </TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="mobile" data-testid="tab-mobile">
                      <Smartphone className="w-4 h-4 mr-2" />
                      Mobile
                    </TabsTrigger>
                    <TabsTrigger value="desktop" data-testid="tab-desktop">
                      <Monitor className="w-4 h-4 mr-2" />
                      Desktop
                    </TabsTrigger>
                    <TabsTrigger value="devops" data-testid="tab-devops">
                      <Wrench className="w-4 h-4 mr-2" />
                      DevOps
                    </TabsTrigger>
                    <TabsTrigger value="database" data-testid="tab-database">
                      <DatabaseZap className="w-4 h-4 mr-2" />
                      Database
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value={selectedCategory} className="h-[calc(100%-60px)]">
                  <ScrollArea className="h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
                      <AnimatePresence mode="popLayout">
                        {filteredTemplates.map((template, index) => (
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card 
                              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 h-full"
                              onClick={() => handleTemplateSelect(template)}
                              data-testid={`template-card-${template.id}`}
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <div className="text-3xl mb-2">{template.icon}</div>
                                  <Badge 
                                    className={categoryColors[template.category] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400'}
                                    variant="secondary"
                                  >
                                    {categoryIcons[template.category] || <Package className="w-5 h-5" />}
                                    <span className="ml-1">{template.category}</span>
                                  </Badge>
                                </div>
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                <CardDescription className="text-sm">
                                  {template.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-1">
                                  {template.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                              <CardFooter>
                                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <FileCode className="w-3 h-3" />
                                    <span>{template.files.length} files</span>
                                  </div>
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Project Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project from Template</DialogTitle>
            <DialogDescription>
              Configure your new project based on the {selectedTemplate?.name} template
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className="text-2xl">{selectedTemplate.icon}</span>
                <div>
                  <p className="font-semibold">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-project"
                  data-testid="input-project-name"
                />
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
              </div>

              <div className="space-y-2">
                <Label>Included in this template:</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{selectedTemplate.files.length} pre-configured files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Ready-to-run development environment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Best practices and modern tooling</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={!projectName.trim() || createProjectMutation.isPending}
              data-testid="button-create-project"
            >
              {createProjectMutation.isPending ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}