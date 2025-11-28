import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/loading-spinner';
import {
  Rocket, Code, Zap, Globe, Server, Database, 
  FileCode, Package, GitBranch, Terminal, ArrowRight
} from 'lucide-react';
import type { ProjectTemplate, CreateProjectFromTemplateResponse } from '@shared/schema';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated?: (projectPath: string, projectName: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  '🚀': Rocket,
  '⚡': Zap,
  '⚛️': Globe,
};

const categoryIcons = {
  backend: Server,
  frontend: Globe,
  fullstack: Database,
};

export function TemplateSelector({ isOpen, onClose, onProjectCreated }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<ProjectTemplate[]>({
    queryKey: ['/api/templates'],
    enabled: isOpen,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: { templateId: string; projectName: string }) => {
      const response = await apiRequest('POST', '/api/project/create-from-template', data);
      return response.json() as Promise<CreateProjectFromTemplateResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Project created successfully!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/project'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      
      if (onProjectCreated) {
        onProjectCreated(data.projectPath, data.projectName);
      }
      
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setIsCreating(false);
    },
  });

  const handleCreateProject = async () => {
    if (!selectedTemplate || !projectName.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a template and enter a project name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    createProjectMutation.mutate({
      templateId: selectedTemplate.id,
      projectName: projectName.trim(),
    });
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setProjectName('');
    setIsCreating(false);
    onClose();
  };

  const getCategories = () => {
    const categories = new Set(templates.map(t => t.category));
    return Array.from(categories);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-2xl font-bold">Create New Project</DialogTitle>
          <DialogDescription>
            Choose a template to quickly start your new project
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : (
            <Tabs defaultValue="all" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 w-full max-w-md">
                <TabsTrigger value="all">All</TabsTrigger>
                {getCategories().map(category => (
                  <TabsTrigger key={category} value={category} className="capitalize">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="all" className="mt-0">
                  <TemplateGrid
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    onSelectTemplate={setSelectedTemplate}
                  />
                </TabsContent>
                
                {getCategories().map(category => (
                  <TabsContent key={category} value={category} className="mt-0">
                    <TemplateGrid
                      templates={templates.filter(t => t.category === category)}
                      selectedTemplate={selectedTemplate}
                      onSelectTemplate={setSelectedTemplate}
                    />
                  </TabsContent>
                ))}
              </ScrollArea>
            </Tabs>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-end gap-4 w-full">
            <div className="flex-1">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-awesome-project"
                disabled={isCreating}
                data-testid="input-project-name"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!selectedTemplate || !projectName.trim() || isCreating}
              data-testid="button-create-project"
            >
              {isCreating ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TemplateGridProps {
  templates: ProjectTemplate[];
  selectedTemplate: ProjectTemplate | null;
  onSelectTemplate: (template: ProjectTemplate) => void;
}

function TemplateGrid({ templates, selectedTemplate, onSelectTemplate }: TemplateGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => {
        const Icon = iconMap[template.icon] || FileCode;
        const CategoryIcon = categoryIcons[template.category];
        const isSelected = selectedTemplate?.id === template.id;

        return (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-md'
              }`}
              onClick={() => onSelectTemplate(template)}
              data-testid={`template-card-${template.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="mt-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {template.commands && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Terminal className="h-3 w-3" />
                      <span>npm run dev</span>
                    </div>
                  </div>
                )}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 pt-3 border-t"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary font-medium">Selected</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}