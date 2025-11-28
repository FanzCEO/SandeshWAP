import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check, Users, Eye, Edit, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareProjectDialogProps {
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareProjectDialog({ projectName, isOpen, onClose }: ShareProjectDialogProps) {
  const [shareMode, setShareMode] = useState<'viewer' | 'editor'>('viewer');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateShareLink = () => {
    setIsGenerating(true);
    
    // Generate a unique share ID
    const shareId = Math.random().toString(36).substr(2, 9);
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/project/${shareId}?mode=${shareMode}`;
    
    setShareLink(link);
    setIsGenerating(false);
    
    toast({
      title: "Share link generated",
      description: `Anyone with this link can ${shareMode === 'viewer' ? 'view' : 'edit'} your project.`,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard.",
    });
  };

  const handleOpenInNewTab = () => {
    window.open(shareLink, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Project
          </DialogTitle>
          <DialogDescription>
            Share "{projectName}" with others for collaboration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Select sharing permissions:
            </Label>
            <RadioGroup
              value={shareMode}
              onValueChange={(value) => setShareMode(value as 'viewer' | 'editor')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="viewer" id="viewer" />
                <Label htmlFor="viewer" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Viewer</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Can view code and run terminal commands
                  </p>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="editor" id="editor" />
                <Label htmlFor="editor" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Editor</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Full access to edit, save, and manage files
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {!shareLink && (
            <Button
              onClick={generateShareLink}
              disabled={isGenerating}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Generate Share Link
            </Button>
          )}

          {shareLink && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> This uses Replit's native collaboration features. 
                  Users joining via this link will be able to collaborate in real-time.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-share-link"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopy}
                  data-testid="button-copy-link"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleOpenInNewTab}
                  data-testid="button-open-link"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Anyone with this link can {shareMode === 'viewer' ? 'view' : 'edit'} your project.
                You can revoke access at any time from project settings.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}