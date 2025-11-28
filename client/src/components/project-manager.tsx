import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FolderOpen, FolderPlus, History, ChevronDown, HardDrive } from 'lucide-react';
import type { ProjectInfo } from '@shared/schema';

interface ProjectManagerProps {
  onProjectChange: (projectPath: string) => void;
}

export function ProjectManager({ onProjectChange }: ProjectManagerProps) {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState('');
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Get current project info
  const { data: projectInfo, refetch } = useQuery<ProjectInfo>({
    queryKey: ['/api/project'],
  });

  // Load recent projects from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentProjects');
    if (stored) {
      setRecentProjects(JSON.parse(stored));
    }
  }, []);

  // Save recent projects to localStorage
  const saveRecentProjects = (projects: string[]) => {
    // Keep only last 10 projects
    const trimmed = projects.slice(0, 10);
    setRecentProjects(trimmed);
    localStorage.setItem('recentProjects', JSON.stringify(trimmed));
  };

  // Change project mutation
  const changeProjectMutation = useMutation({
    mutationFn: async (projectPath: string) => {
      const response = await apiRequest('POST', '/api/project/change', { path: projectPath });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Add to recent projects
      const updated = [variables, ...recentProjects.filter(p => p !== variables)];
      saveRecentProjects(updated);
      
      // Store current project
      localStorage.setItem('currentProject', variables);
      
      onProjectChange(variables);
      refetch();
      setShowOpenDialog(false);
      setNewProjectPath('');
      
      toast({
        title: "Project changed",
        description: `Switched to ${data.name}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to change project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load last project on mount
  useEffect(() => {
    const lastProject = localStorage.getItem('currentProject');
    if (lastProject && !projectInfo) {
      changeProjectMutation.mutate(lastProject);
    }
  }, []);

  const handleOpenProject = () => {
    if (!newProjectPath.trim()) return;
    changeProjectMutation.mutate(newProjectPath);
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="button-project-menu">
            <FolderOpen className="w-4 h-4 mr-2" />
            <span className="max-w-[200px] truncate">
              {projectInfo?.name || 'No project'}
            </span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64">
          {projectInfo && (
            <>
              <div className="px-2 py-1.5">
                <div className="text-sm font-medium">{projectInfo.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <div className="flex items-center justify-between">
                    <span>Files: {projectInfo.filesCount}</span>
                    <span>Size: {formatFileSize(projectInfo.size)}</span>
                  </div>
                  <div className="mt-1 truncate" title={projectInfo.path}>
                    {projectInfo.path}
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem onClick={() => setShowOpenDialog(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Open Folder
          </DropdownMenuItem>
          
          <DropdownMenuItem disabled>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </DropdownMenuItem>
          
          {recentProjects.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <div className="text-xs text-muted-foreground flex items-center">
                  <History className="w-3 h-3 mr-1" />
                  Recent Projects
                </div>
              </div>
              {recentProjects.map((project, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => changeProjectMutation.mutate(project)}
                  className="text-sm"
                >
                  <HardDrive className="w-3 h-3 mr-2" />
                  <span className="truncate">{project.split('/').pop() || project}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Open Project Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Project Folder</DialogTitle>
            <DialogDescription>
              Enter the path to your project folder. The path should be relative to the server's working directory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              value={newProjectPath}
              onChange={(e) => setNewProjectPath(e.target.value)}
              placeholder="e.g., ./my-project or /home/user/projects/my-app"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleOpenProject();
                }
              }}
              data-testid="input-project-path"
            />
            
            <div className="text-sm text-muted-foreground">
              <p>Examples:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Current directory: <code>.</code></li>
                <li>Parent directory: <code>..</code></li>
                <li>Subdirectory: <code>./projects/my-app</code></li>
                <li>Absolute path: <code>/home/user/projects</code></li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleOpenProject}
              disabled={!newProjectPath.trim() || changeProjectMutation.isPending}
              data-testid="button-open-project"
            >
              {changeProjectMutation.isPending ? 'Opening...' : 'Open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}