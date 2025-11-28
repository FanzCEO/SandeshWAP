import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, FileCode2, X } from 'lucide-react';
import type { SearchResult } from '@shared/schema';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResultClick: (result: SearchResult) => void;
}

export function GlobalSearch({ open, onOpenChange, onResultClick }: GlobalSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Search query
  const { data: results = [], refetch } = useQuery<SearchResult[]>({
    queryKey: ['/api/search', { q: searchQuery, caseSensitive }],
    enabled: false, // Manual trigger
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    await refetch();
    setIsSearching(false);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    onOpenChange(false);
  };

  const highlightMatch = (text: string, query: string): JSX.Element => {
    if (!query) return <>{text}</>;
    
    const regex = new RegExp(`(${query})`, caseSensitive ? 'g' : 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 text-inherit">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search in Files</DialogTitle>
          <DialogDescription>
            Search for text across all files in your project.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter search term..."
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                autoFocus
                data-testid="input-search-query"
              />
            </div>
            
            <Button 
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              data-testid="button-search"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="case-sensitive"
                checked={caseSensitive}
                onCheckedChange={(checked) => setCaseSensitive(checked as boolean)}
              />
              <label
                htmlFor="case-sensitive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Case sensitive
              </label>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {results.length > 0 && `${results.length} results found`}
            </div>
          </div>
          
          {results.length > 0 && (
            <ScrollArea className="h-[400px] w-full rounded-md border p-2">
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={`${result.path}-${result.line}-${index}`}
                    className="p-3 rounded-md border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                    data-testid={`search-result-${index}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <FileCode2 className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium">{result.path}</span>
                          <span className="text-xs text-muted-foreground">
                            Line {result.line}
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground font-mono">
                          {highlightMatch(result.content, searchQuery)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {searchQuery && results.length === 0 && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}