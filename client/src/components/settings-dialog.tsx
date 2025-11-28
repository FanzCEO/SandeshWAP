import React, { useState, useEffect } from 'react';
import { useTheme } from '@/providers/theme-provider';
import { themes, UISettings } from '@/lib/themes';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Palette, Code, Terminal, Settings, Download, Upload, 
  RotateCcw, Eye, Moon, Sun, Monitor, Contrast,
  Layout, Type, Sliders, Save, X
} from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, uiSettings, setTheme, setUISettings, customColors, setCustomColors, resetToDefaults, exportSettings, importSettings } = useTheme();
  const { toast } = useToast();
  
  const [localUISettings, setLocalUISettings] = useState<UISettings>(uiSettings);
  const [localCustomColors, setLocalCustomColors] = useState(customColors);
  const [previewTheme, setPreviewTheme] = useState(theme.id);
  const [customCSS, setCustomCSS] = useState(uiSettings.customCSS || '');
  
  useEffect(() => {
    setLocalUISettings(uiSettings);
    setLocalCustomColors(customColors);
    setCustomCSS(uiSettings.customCSS || '');
  }, [uiSettings, customColors]);

  const handleThemeChange = (themeId: string) => {
    setPreviewTheme(themeId);
    setTheme(themeId);
  };

  const handleUISettingChange = <K extends keyof UISettings>(key: K, value: UISettings[K]) => {
    const newSettings = { ...localUISettings, [key]: value };
    setLocalUISettings(newSettings);
    setUISettings(newSettings);
  };

  const handleColorChange = (colorKey: string, value: string) => {
    const newColors = { ...localCustomColors, [colorKey]: value };
    setLocalCustomColors(newColors);
    setCustomColors(newColors);
  };

  const handleExport = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sandesh-wap-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Settings exported",
      description: "Your settings have been exported successfully.",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (importSettings(content)) {
            toast({
              title: "Settings imported",
              description: "Your settings have been imported successfully.",
            });
            onOpenChange(false);
          } else {
            toast({
              title: "Import failed",
              description: "Failed to import settings. Please check the file format.",
              variant: "destructive",
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      resetToDefaults();
      toast({
        title: "Settings reset",
        description: "All settings have been reset to defaults.",
      });
      onOpenChange(false);
    }
  };

  const handleSaveCustomCSS = () => {
    handleUISettingChange('customCSS', customCSS);
    toast({
      title: "Custom CSS saved",
      description: "Your custom CSS has been applied.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="appearance" className="flex h-full">
          <TabsList className="flex flex-col h-full w-48 bg-muted/50 rounded-none p-2 justify-start">
            <TabsTrigger value="appearance" className="w-full justify-start" data-testid="tab-appearance">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="editor" className="w-full justify-start" data-testid="tab-editor">
              <Code className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="terminal" className="w-full justify-start" data-testid="tab-terminal">
              <Terminal className="w-4 h-4 mr-2" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="ui" className="w-full justify-start" data-testid="tab-ui">
              <Layout className="w-4 h-4 mr-2" />
              UI Layout
            </TabsTrigger>
            <TabsTrigger value="advanced" className="w-full justify-start" data-testid="tab-advanced">
              <Sliders className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
            
            <div className="flex-1" />
            
            <Separator className="my-2" />
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleExport}
                data-testid="button-export-settings"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleImport}
                data-testid="button-import-settings"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Settings
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleReset}
                data-testid="button-reset-settings"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </TabsList>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <TabsContent value="appearance" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Choose your preferred color theme</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {Object.values(themes).map((t) => (
                        <button
                          key={t.id}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            previewTheme === t.id 
                              ? 'border-primary shadow-lg' 
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleThemeChange(t.id)}
                          data-testid={`theme-${t.id}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {t.id === 'light' && <Sun className="w-4 h-4" />}
                            {t.id === 'dark' && <Moon className="w-4 h-4" />}
                            {t.id === 'highContrast' && <Contrast className="w-4 h-4" />}
                            {!['light', 'dark', 'highContrast'].includes(t.id) && <Monitor className="w-4 h-4" />}
                            <span className="font-medium">{t.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground text-left">{t.description}</p>
                          <div className="flex gap-1 mt-3">
                            <div 
                              className="w-6 h-6 rounded-full border"
                              style={{ backgroundColor: t.colors.background }}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border"
                              style={{ backgroundColor: t.colors.primary }}
                            />
                            <div 
                              className="w-6 h-6 rounded-full border"
                              style={{ backgroundColor: t.colors.accent }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Custom Colors</CardTitle>
                    <CardDescription>Override theme colors with custom values</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primary-color">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primary-color"
                            type="color"
                            className="w-20"
                            value={localCustomColors.primary || theme.colors.primary}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            data-testid="input-primary-color"
                          />
                          <Input
                            type="text"
                            value={localCustomColors.primary || theme.colors.primary}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            placeholder="hsl(280, 100%, 60%)"
                            data-testid="input-primary-color-text"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="accent-color">Accent Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="accent-color"
                            type="color"
                            className="w-20"
                            value={localCustomColors.accent || theme.colors.accent}
                            onChange={(e) => handleColorChange('accent', e.target.value)}
                            data-testid="input-accent-color"
                          />
                          <Input
                            type="text"
                            value={localCustomColors.accent || theme.colors.accent}
                            onChange={(e) => handleColorChange('accent', e.target.value)}
                            placeholder="hsl(280, 100%, 60%)"
                            data-testid="input-accent-color-text"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="editor" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Editor Settings</CardTitle>
                    <CardDescription>Customize the code editor appearance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="editor-theme">Editor Theme</Label>
                      <Select 
                        value={theme.editor.theme}
                        onValueChange={(value) => {
                          // This would need to be handled differently to allow independent editor theme
                          toast({
                            title: "Info",
                            description: "Editor theme syncs with app theme for consistency.",
                          });
                        }}
                      >
                        <SelectTrigger id="editor-theme" data-testid="select-editor-theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vs">Visual Studio Light</SelectItem>
                          <SelectItem value="vs-dark">Visual Studio Dark</SelectItem>
                          <SelectItem value="hc-black">High Contrast Black</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editor-font">Font Family</Label>
                      <Input
                        id="editor-font"
                        value={theme.editor.fontFamily}
                        placeholder="JetBrains Mono, Fira Code, monospace"
                        data-testid="input-editor-font"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editor-font-size">Font Size: {theme.editor.fontSize}px</Label>
                      <Slider
                        id="editor-font-size"
                        min={10}
                        max={24}
                        step={1}
                        value={[theme.editor.fontSize]}
                        className="w-full"
                        data-testid="slider-editor-font-size"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editor-line-height">Line Height: {theme.editor.lineHeight}</Label>
                      <Slider
                        id="editor-line-height"
                        min={1}
                        max={2}
                        step={0.1}
                        value={[theme.editor.lineHeight]}
                        className="w-full"
                        data-testid="slider-editor-line-height"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="terminal" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Terminal Colors</CardTitle>
                    <CardDescription>Customize terminal color scheme</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="terminal-bg">Background</Label>
                        <div className="flex gap-2">
                          <Input
                            id="terminal-bg"
                            type="color"
                            className="w-20"
                            value={theme.terminal.background}
                            data-testid="input-terminal-bg"
                          />
                          <Input
                            type="text"
                            value={theme.terminal.background}
                            readOnly
                            data-testid="input-terminal-bg-text"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="terminal-fg">Foreground</Label>
                        <div className="flex gap-2">
                          <Input
                            id="terminal-fg"
                            type="color"
                            className="w-20"
                            value={theme.terminal.foreground}
                            data-testid="input-terminal-fg"
                          />
                          <Input
                            type="text"
                            value={theme.terminal.foreground}
                            readOnly
                            data-testid="input-terminal-fg-text"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">ANSI Colors</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].map((color) => (
                          <div key={color} className="space-y-1">
                            <Label className="text-xs capitalize">{color}</Label>
                            <div className="flex gap-1">
                              <div 
                                className="w-8 h-8 rounded border cursor-pointer"
                                style={{ backgroundColor: theme.terminal[color as keyof typeof theme.terminal] as string }}
                                data-testid={`color-${color}`}
                              />
                              <div 
                                className="w-8 h-8 rounded border cursor-pointer"
                                style={{ backgroundColor: theme.terminal[`bright${color.charAt(0).toUpperCase() + color.slice(1)}` as keyof typeof theme.terminal] as string }}
                                data-testid={`color-bright-${color}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ui" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>UI Layout</CardTitle>
                    <CardDescription>Customize the user interface layout</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ui-density">UI Density</Label>
                      <Select 
                        value={localUISettings.density}
                        onValueChange={(value: 'compact' | 'normal' | 'comfortable') => 
                          handleUISettingChange('density', value)
                        }
                      >
                        <SelectTrigger id="ui-density" data-testid="select-ui-density">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="comfortable">Comfortable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sidebar-position">Sidebar Position</Label>
                      <Select 
                        value={localUISettings.sidebarPosition}
                        onValueChange={(value: 'left' | 'right') => 
                          handleUISettingChange('sidebarPosition', value)
                        }
                      >
                        <SelectTrigger id="sidebar-position" data-testid="select-sidebar-position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Visibility</h4>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-status-bar">Show Status Bar</Label>
                        <Switch
                          id="show-status-bar"
                          checked={localUISettings.showStatusBar}
                          onCheckedChange={(checked) => 
                            handleUISettingChange('showStatusBar', checked)
                          }
                          data-testid="switch-show-status-bar"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-activity-bar">Show Activity Bar</Label>
                        <Switch
                          id="show-activity-bar"
                          checked={localUISettings.showActivityBar}
                          onCheckedChange={(checked) => 
                            handleUISettingChange('showActivityBar', checked)
                          }
                          data-testid="switch-show-activity-bar"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="ui-font">UI Font Family</Label>
                      <Input
                        id="ui-font"
                        value={localUISettings.fontFamily}
                        onChange={(e) => handleUISettingChange('fontFamily', e.target.value)}
                        placeholder="Inter, system-ui, sans-serif"
                        data-testid="input-ui-font"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom CSS</CardTitle>
                    <CardDescription>
                      Add custom CSS for advanced customization. Use with caution!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={customCSS}
                      onChange={(e) => setCustomCSS(e.target.value)}
                      placeholder="/* Add your custom CSS here */&#10;.custom-class {&#10;  /* your styles */&#10;}"
                      className="font-mono text-sm min-h-[200px]"
                      data-testid="textarea-custom-css"
                    />
                    <Button 
                      onClick={handleSaveCustomCSS}
                      className="w-full"
                      data-testid="button-save-custom-css"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Apply Custom CSS
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>Live preview of your customizations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg border space-y-3" style={{
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}>
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>This is a preview of your theme</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" data-testid="button-preview-primary">Primary Button</Button>
                        <Button size="sm" variant="secondary" data-testid="button-preview-secondary">Secondary</Button>
                        <Button size="sm" variant="outline" data-testid="button-preview-outline">Outline</Button>
                        <Button size="sm" variant="destructive" data-testid="button-preview-destructive">Destructive</Button>
                      </div>
                      <div className="p-3 rounded" style={{
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                      }}>
                        <p className="text-sm">This is a card component with your theme colors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}