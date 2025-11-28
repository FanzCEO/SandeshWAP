import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes, Theme, UISettings, defaultUISettings } from '@/lib/themes';

interface ThemeContextType {
  theme: Theme;
  uiSettings: UISettings;
  setTheme: (themeId: string) => void;
  setUISettings: (settings: UISettings) => void;
  customColors: Record<string, string>;
  setCustomColors: (colors: Record<string, string>) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentThemeId, setCurrentThemeId] = useState<string>('dark');
  const [uiSettings, setUISettings] = useState<UISettings>(defaultUISettings);
  const [customColors, setCustomColors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load settings from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedThemeId = localStorage.getItem('themeId');
      const savedUISettings = localStorage.getItem('uiSettings');
      const savedCustomColors = localStorage.getItem('customColors');
      
      if (savedThemeId) setCurrentThemeId(savedThemeId);
      if (savedUISettings) setUISettings(JSON.parse(savedUISettings));
      if (savedCustomColors) setCustomColors(JSON.parse(savedCustomColors));
      
      setIsInitialized(true);
    }
  }, []);

  const theme = themes[currentThemeId] || themes.dark;

  // Apply theme colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = { ...theme.colors, ...customColors };
    
    Object.entries(colors).forEach(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value);
    });
    
    // Apply UI settings
    root.style.setProperty('--font-family', uiSettings.fontFamily);
    
    // Apply density
    switch (uiSettings.density) {
      case 'compact':
        root.classList.add('density-compact');
        root.classList.remove('density-normal', 'density-comfortable');
        break;
      case 'comfortable':
        root.classList.add('density-comfortable');
        root.classList.remove('density-normal', 'density-compact');
        break;
      default:
        root.classList.add('density-normal');
        root.classList.remove('density-compact', 'density-comfortable');
    }
    
    // Apply sidebar position
    if (uiSettings.sidebarPosition === 'right') {
      root.classList.add('sidebar-right');
    } else {
      root.classList.remove('sidebar-right');
    }
    
    // Apply custom CSS
    let customStyleElement = document.getElementById('custom-theme-styles');
    if (uiSettings.customCSS) {
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-theme-styles';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = uiSettings.customCSS;
    } else if (customStyleElement) {
      customStyleElement.remove();
    }
  }, [theme, customColors, uiSettings]);

  const setTheme = (themeId: string) => {
    if (themes[themeId]) {
      setCurrentThemeId(themeId);
      localStorage.setItem('themeId', themeId);
    }
  };

  const updateUISettings = (settings: UISettings) => {
    setUISettings(settings);
    localStorage.setItem('uiSettings', JSON.stringify(settings));
  };

  const updateCustomColors = (colors: Record<string, string>) => {
    setCustomColors(colors);
    localStorage.setItem('customColors', JSON.stringify(colors));
  };

  const resetToDefaults = () => {
    setCurrentThemeId('dark');
    setUISettings(defaultUISettings);
    setCustomColors({});
    localStorage.removeItem('themeId');
    localStorage.removeItem('uiSettings');
    localStorage.removeItem('customColors');
  };

  const exportSettings = () => {
    const settings = {
      themeId: currentThemeId,
      uiSettings,
      customColors,
      version: '1.0.0',
    };
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (json: string): boolean => {
    try {
      const settings = JSON.parse(json);
      if (settings.themeId && themes[settings.themeId]) {
        setTheme(settings.themeId);
      }
      if (settings.uiSettings) {
        updateUISettings(settings.uiSettings);
      }
      if (settings.customColors) {
        updateCustomColors(settings.customColors);
      }
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        uiSettings,
        setTheme,
        setUISettings: updateUISettings,
        customColors,
        setCustomColors: updateCustomColors,
        resetToDefaults,
        exportSettings,
        importSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}