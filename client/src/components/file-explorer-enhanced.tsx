import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  File, 
  Folder, 
  FileText, 
  FileCode2, 
  FileJson, 
  FileImage,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit3,
  Copy,
  Scissors,
  ClipboardPaste,
  ChevronRight,
  ChevronDown,
  Search,
  FolderOpen
} from 'lucide-react';
import type { FileNode, FileContent } from '@shared/schema';

interface FileExplorerProps {
  onFileSelect: (file: FileNode) => void;
  selectedFile?: FileNode;
  projectPath?: string;
}

export function FileExplorerEnhanced({ onFileSelect, selectedFile, projectPath }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [contextMenuTarget, setContextMenuTarget] = useState<FileNode | null>(null);
  const [showNewItemDialog, setShowNewItemDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newItemType, setNewItemType] = useState<'file' | 'directory'>('file');
  const [newItemName, setNewItemName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [clipboard, setClipboard] = useState<{ action: 'cut' | 'copy'; node: FileNode } | null>(null);
  const [draggedNode, setDraggedNode] = useState<FileNode | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch file tree
  const { data: fileTree = [], isLoading, refetch } = useQuery<FileNode[]>({
    queryKey: ['/api/files', projectPath],
  });

  // WebSocket for file system changes
  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/filesystem`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type !== 'connected') {
        // Refetch file tree on file system changes
        refetch();
        toast({
          title: "File system changed",
          description: `${data.type}: ${data.path}`,
        });
      }
    };

    return () => ws.close();
  }, [refetch, toast]);

  // Create file/directory mutation
  const createMutation = useMutation({
    mutationFn: async ({ path, type }: { path: string; type: 'file' | 'directory' }) => {
      const endpoint = type === 'file' ? '/api/file/create' : '/api/directory/create';
      const response = await apiRequest('POST', endpoint, { path });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setShowNewItemDialog(false);
      setNewItemName('');
      toast({
        title: "Created successfully",
        description: `New ${newItemType} created.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      const response = await apiRequest('DELETE', '/api/file', { path });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Deleted successfully",
        description: "Item has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
      const response = await apiRequest('POST', '/api/file/rename', { oldPath, newName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setShowRenameDialog(false);
      setRenameValue('');
      toast({
        title: "Renamed successfully",
        description: "Item has been renamed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rename failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async ({ sourcePath, targetDir }: { sourcePath: string; targetDir: string }) => {
      const response = await apiRequest('POST', '/api/file/move', { sourcePath, targetDir });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      toast({
        title: "Moved successfully",
        description: "Item has been moved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Move failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return expandedFolders.has(node.path) ? 
        <FolderOpen className="w-4 h-4 text-blue-400" /> : 
        <Folder className="w-4 h-4 text-blue-400" />;
    }

    const extension = node.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <FileCode2 className="w-4 h-4 text-yellow-400" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-green-400" />;
      case 'md':
        return <FileText className="w-4 h-4 text-gray-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <FileImage className="w-4 h-4 text-purple-400" />;
      default:
        return <File className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleContextMenu = (node: FileNode) => {
    setContextMenuTarget(node);
  };

  const handleNewItem = (type: 'file' | 'directory', parentPath?: string) => {
    setNewItemType(type);
    setNewItemName('');
    setShowNewItemDialog(true);
  };

  const handleCreateNewItem = () => {
    if (!newItemName.trim()) return;
    
    const parentPath = contextMenuTarget?.type === 'directory' ? contextMenuTarget.path : '';
    const fullPath = parentPath ? `${parentPath}/${newItemName}` : newItemName;
    
    createMutation.mutate({ path: fullPath, type: newItemType });
  };

  const handleRename = () => {
    if (!contextMenuTarget) return;
    setRenameValue(contextMenuTarget.name);
    setShowRenameDialog(true);
  };

  const handleConfirmRename = () => {
    if (!contextMenuTarget || !renameValue.trim()) return;
    renameMutation.mutate({ oldPath: contextMenuTarget.path, newName: renameValue });
  };

  const handleDelete = () => {
    if (!contextMenuTarget) return;
    
    const confirmMessage = contextMenuTarget.type === 'directory' 
      ? `Are you sure you want to delete the folder "${contextMenuTarget.name}" and all its contents?`
      : `Are you sure you want to delete "${contextMenuTarget.name}"?`;
    
    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(contextMenuTarget.path);
    }
  };

  const handleCopy = () => {
    if (!contextMenuTarget) return;
    setClipboard({ action: 'copy', node: contextMenuTarget });
    toast({
      title: "Copied",
      description: `"${contextMenuTarget.name}" copied to clipboard.`,
    });
  };

  const handleCut = () => {
    if (!contextMenuTarget) return;
    setClipboard({ action: 'cut', node: contextMenuTarget });
    toast({
      title: "Cut",
      description: `"${contextMenuTarget.name}" ready to move.`,
    });
  };

  const handlePaste = () => {
    if (!clipboard || !contextMenuTarget) return;
    
    const targetDir = contextMenuTarget.type === 'directory' ? contextMenuTarget.path : '';
    
    if (clipboard.action === 'cut') {
      moveMutation.mutate({ sourcePath: clipboard.node.path, targetDir });
      setClipboard(null);
    } else {
      // For copy, we would need to implement a copy endpoint
      toast({
        title: "Copy not implemented",
        description: "File copying will be implemented soon.",
        variant: "destructive",
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault();
    if (node.type === 'directory' && draggedNode && node.path !== draggedNode.path) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverPath(node.path);
    }
  };

  const handleDragLeave = () => {
    setDragOverPath(null);
  };

  const handleDrop = (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    setDragOverPath(null);
    
    if (!draggedNode || targetNode.type !== 'directory' || draggedNode.path === targetNode.path) {
      return;
    }

    moveMutation.mutate({ sourcePath: draggedNode.path, targetDir: targetNode.path });
    setDraggedNode(null);
  };

  const renderTreeNode = (node: FileNode, level: number = 0): JSX.Element => {
    const isSelected = selectedFile?.path === node.path;
    const isExpanded = expandedFolders.has(node.path);
    const isDragOver = dragOverPath === node.path;

    return (
      <div key={node.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center text-sm py-1.5 px-2 rounded cursor-pointer hover:bg-accent ${
                isSelected ? 'bg-accent text-accent-foreground' : ''
              } ${isDragOver ? 'bg-blue-500/20' : ''}`}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => {
                if (node.type === 'directory') {
                  toggleFolder(node.path);
                } else {
                  onFileSelect(node);
                }
              }}
              onContextMenu={() => handleContextMenu(node)}
              draggable
              onDragStart={(e) => handleDragStart(e, node)}
              onDragOver={(e) => handleDragOver(e, node)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, node)}
              data-testid={`${node.type}-${node.path}`}
            >
              {node.type === 'directory' && (
                <span className="mr-1">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              )}
              {getFileIcon(node)}
              <span className="ml-2 flex-1">{node.name}</span>
              {isSelected && node.type === 'file' && (
                <div className="w-2 h-2 bg-orange-500 rounded-full ml-auto" />
              )}
            </div>
          </ContextMenuTrigger>
          
          <ContextMenuContent>
            {node.type === 'directory' && (
              <>
                <ContextMenuItem onClick={() => handleNewItem('file')}>
                  <FilePlus className="w-4 h-4 mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleNewItem('directory')}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            
            <ContextMenuItem onClick={handleRename}>
              <Edit3 className="w-4 h-4 mr-2" />
              Rename
            </ContextMenuItem>
            
            <ContextMenuItem onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </ContextMenuItem>
            
            <ContextMenuItem onClick={handleCut}>
              <Scissors className="w-4 h-4 mr-2" />
              Cut
            </ContextMenuItem>
            
            {node.type === 'directory' && clipboard && (
              <ContextMenuItem onClick={handlePaste}>
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Paste
              </ContextMenuItem>
            )}
            
            <ContextMenuSeparator />
            
            <ContextMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        
        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explorer</h2>
        </div>
        <div className="flex-1 p-2">
          <div className="text-sm text-muted-foreground">Loading files...</div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explorer</h2>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleNewItem('file')}
              title="New File"
              data-testid="button-new-file"
            >
              <FilePlus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleNewItem('directory')}
              title="New Folder"
              data-testid="button-new-folder"
            >
              <FolderPlus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              title="Refresh"
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            {fileTree.map(node => renderTreeNode(node))}
          </div>
        </div>
      </aside>

      {/* New Item Dialog */}
      <Dialog open={showNewItemDialog} onOpenChange={setShowNewItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {newItemType === 'file' ? 'File' : 'Folder'}</DialogTitle>
            <DialogDescription>
              Enter a name for the new {newItemType}.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={newItemType === 'file' ? 'filename.ext' : 'folder-name'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateNewItem();
              }
            }}
            data-testid="input-new-item-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewItem} data-testid="button-create-new-item">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for "{contextMenuTarget?.name}".
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirmRename();
              }
            }}
            data-testid="input-rename"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename} data-testid="button-confirm-rename">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}