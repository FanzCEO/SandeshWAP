import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { File } from '@shared/schema';

interface FileExplorerProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File;
}

export function FileExplorer({ onFileSelect, selectedFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['project-root']));

  const { data: files = [], isLoading } = useQuery<File[]>({
    queryKey: ['/api/files'],
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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return 'fas fa-file-code text-blue-400';
      case 'json':
        return 'fas fa-file-alt text-green-400';
      case 'md':
        return 'fas fa-file-alt text-gray-400';
      default:
        return 'fas fa-file text-gray-400';
    }
  };

  const buildFileTree = (files: File[]) => {
    const tree: { [key: string]: any } = {};
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // This is a file
          current[part] = file;
        } else {
          // This is a folder
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      });
    });
    
    return tree;
  };

  const renderTreeNode = (node: any, path: string = '', level: number = 0): JSX.Element[] => {
    const items: JSX.Element[] = [];
    
    Object.entries(node).forEach(([name, value]) => {
      const currentPath = path ? `${path}/${name}` : name;
      const isFile = value && typeof value === 'object' && 'id' in value;
      
      if (isFile) {
        const file = value as File;
        const isSelected = selectedFile?.id === file.id;
        
        items.push(
          <div
            key={file.id}
            className={`flex items-center text-sm py-1.5 px-2 rounded cursor-pointer ml-${level * 6} ${
              isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => onFileSelect(file)}
            data-testid={`file-${file.path}`}
          >
            <i className="w-4 mr-1"></i>
            <i className={`${getFileIcon(name)} mr-2`}></i>
            <span>{name}</span>
            {isSelected && <div className="w-2 h-2 bg-orange-500 rounded-full ml-auto"></div>}
          </div>
        );
      } else {
        const isExpanded = expandedFolders.has(currentPath);
        
        items.push(
          <div key={currentPath}>
            <div
              className={`flex items-center text-sm py-1.5 px-2 rounded hover:bg-accent cursor-pointer ml-${level * 6}`}
              onClick={() => toggleFolder(currentPath)}
              data-testid={`folder-${currentPath}`}
            >
              <i className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} w-4 text-muted-foreground mr-1`}></i>
              <i className="fas fa-folder text-yellow-500 mr-2"></i>
              <span>{name}</span>
            </div>
            
            {isExpanded && (
              <div>
                {renderTreeNode(value, currentPath, level + 1)}
              </div>
            )}
          </div>
        );
      }
    });
    
    return items;
  };

  if (isLoading) {
    return (
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explorer</h2>
        </div>
        <div className="flex-1 p-2">
          <div className="text-sm text-muted-foreground">Loading files...</div>
        </div>
      </aside>
    );
  }

  const fileTree = buildFileTree(files);

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Explorer</h2>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          <div
            className="flex items-center text-sm py-1.5 px-2 rounded hover:bg-accent cursor-pointer"
            onClick={() => toggleFolder('project-root')}
            data-testid="folder-project-root"
          >
            <i className={`fas ${expandedFolders.has('project-root') ? 'fa-chevron-down' : 'fa-chevron-right'} w-4 text-muted-foreground mr-1`}></i>
            <i className="fas fa-folder text-yellow-500 mr-2"></i>
            <span>project-root</span>
          </div>
          
          {expandedFolders.has('project-root') && (
            <div className="ml-6 space-y-1">
              {renderTreeNode(fileTree)}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
