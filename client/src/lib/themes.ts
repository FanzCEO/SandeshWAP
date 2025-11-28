export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  editor: {
    theme: string; // Monaco editor theme name
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
  };
  terminal: {
    background: string;
    foreground: string;
    cursor: string;
    selection: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
  };
}

export const themes: Record<string, Theme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme with purple accents',
    colors: {
      background: 'hsl(225, 6%, 13%)',
      foreground: 'hsl(210, 40%, 95%)',
      card: 'hsl(225, 6%, 16%)',
      cardForeground: 'hsl(210, 40%, 95%)',
      popover: 'hsl(225, 6%, 16%)',
      popoverForeground: 'hsl(210, 40%, 95%)',
      primary: 'hsl(280, 100%, 60%)',
      primaryForeground: 'hsl(0, 0%, 100%)',
      secondary: 'hsl(225, 6%, 20%)',
      secondaryForeground: 'hsl(210, 40%, 90%)',
      muted: 'hsl(225, 6%, 18%)',
      mutedForeground: 'hsl(210, 20%, 60%)',
      accent: 'hsl(280, 100%, 60%)',
      accentForeground: 'hsl(0, 0%, 100%)',
      destructive: 'hsl(0, 62.8%, 50.6%)',
      destructiveForeground: 'hsl(0, 0%, 100%)',
      border: 'hsl(225, 6%, 22%)',
      input: 'hsl(225, 6%, 22%)',
      ring: 'hsl(280, 100%, 60%)',
    },
    editor: {
      theme: 'vs-dark',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
    terminal: {
      background: '#0c0c0c',
      foreground: '#cccccc',
      cursor: '#cccccc',
      selection: '#3a3a3a',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5',
    },
  },
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme for daytime use',
    colors: {
      background: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(222.2, 84%, 4.9%)',
      card: 'hsl(0, 0%, 100%)',
      cardForeground: 'hsl(222.2, 84%, 4.9%)',
      popover: 'hsl(0, 0%, 100%)',
      popoverForeground: 'hsl(222.2, 84%, 4.9%)',
      primary: 'hsl(262.1, 83.3%, 57.8%)',
      primaryForeground: 'hsl(210, 40%, 98%)',
      secondary: 'hsl(210, 40%, 96.1%)',
      secondaryForeground: 'hsl(222.2, 47.4%, 11.2%)',
      muted: 'hsl(210, 40%, 96.1%)',
      mutedForeground: 'hsl(215.4, 16.3%, 46.9%)',
      accent: 'hsl(210, 40%, 96.1%)',
      accentForeground: 'hsl(222.2, 47.4%, 11.2%)',
      destructive: 'hsl(0, 84.2%, 60.2%)',
      destructiveForeground: 'hsl(210, 40%, 98%)',
      border: 'hsl(214.3, 31.8%, 91.4%)',
      input: 'hsl(214.3, 31.8%, 91.4%)',
      ring: 'hsl(262.1, 83.3%, 57.8%)',
    },
    editor: {
      theme: 'vs',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
    terminal: {
      background: '#ffffff',
      foreground: '#333333',
      cursor: '#333333',
      selection: '#add6ff',
      black: '#000000',
      red: '#cd3131',
      green: '#00bc00',
      yellow: '#949800',
      blue: '#0451a5',
      magenta: '#bc05bc',
      cyan: '#0598bc',
      white: '#555555',
      brightBlack: '#686868',
      brightRed: '#cd3131',
      brightGreen: '#00bc00',
      brightYellow: '#949800',
      brightBlue: '#0451a5',
      brightMagenta: '#bc05bc',
      brightCyan: '#0598bc',
      brightWhite: '#a5a5a5',
    },
  },
  highContrast: {
    id: 'highContrast',
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    colors: {
      background: 'hsl(0, 0%, 0%)',
      foreground: 'hsl(0, 0%, 100%)',
      card: 'hsl(0, 0%, 0%)',
      cardForeground: 'hsl(0, 0%, 100%)',
      popover: 'hsl(0, 0%, 0%)',
      popoverForeground: 'hsl(0, 0%, 100%)',
      primary: 'hsl(60, 100%, 50%)',
      primaryForeground: 'hsl(0, 0%, 0%)',
      secondary: 'hsl(0, 0%, 10%)',
      secondaryForeground: 'hsl(0, 0%, 100%)',
      muted: 'hsl(0, 0%, 15%)',
      mutedForeground: 'hsl(0, 0%, 85%)',
      accent: 'hsl(180, 100%, 50%)',
      accentForeground: 'hsl(0, 0%, 0%)',
      destructive: 'hsl(0, 100%, 50%)',
      destructiveForeground: 'hsl(0, 0%, 100%)',
      border: 'hsl(0, 0%, 100%)',
      input: 'hsl(0, 0%, 10%)',
      ring: 'hsl(60, 100%, 50%)',
    },
    editor: {
      theme: 'hc-black',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 16,
      lineHeight: 1.6,
    },
    terminal: {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#ffffff',
      selection: '#ffff00',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      magenta: '#ff00ff',
      cyan: '#00ffff',
      white: '#ffffff',
      brightBlack: '#808080',
      brightRed: '#ff0000',
      brightGreen: '#00ff00',
      brightYellow: '#ffff00',
      brightBlue: '#0000ff',
      brightMagenta: '#ff00ff',
      brightCyan: '#00ffff',
      brightWhite: '#ffffff',
    },
  },
  solarizedDark: {
    id: 'solarizedDark',
    name: 'Solarized Dark',
    description: 'Popular Solarized dark color scheme',
    colors: {
      background: 'hsl(192, 100%, 5%)',
      foreground: 'hsl(186, 8%, 55%)',
      card: 'hsl(192, 100%, 7%)',
      cardForeground: 'hsl(186, 8%, 55%)',
      popover: 'hsl(192, 100%, 7%)',
      popoverForeground: 'hsl(186, 8%, 55%)',
      primary: 'hsl(168, 100%, 29%)',
      primaryForeground: 'hsl(44, 87%, 94%)',
      secondary: 'hsl(192, 100%, 10%)',
      secondaryForeground: 'hsl(186, 8%, 65%)',
      muted: 'hsl(192, 100%, 10%)',
      mutedForeground: 'hsl(186, 8%, 45%)',
      accent: 'hsl(205, 82%, 33%)',
      accentForeground: 'hsl(44, 87%, 94%)',
      destructive: 'hsl(1, 73%, 42%)',
      destructiveForeground: 'hsl(44, 87%, 94%)',
      border: 'hsl(194, 14%, 14%)',
      input: 'hsl(194, 14%, 14%)',
      ring: 'hsl(168, 100%, 29%)',
    },
    editor: {
      theme: 'vs-dark',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
    terminal: {
      background: '#002b36',
      foreground: '#839496',
      cursor: '#839496',
      selection: '#073642',
      black: '#073642',
      red: '#dc322f',
      green: '#859900',
      yellow: '#b58900',
      blue: '#268bd2',
      magenta: '#d33682',
      cyan: '#2aa198',
      white: '#eee8d5',
      brightBlack: '#002b36',
      brightRed: '#cb4b16',
      brightGreen: '#586e75',
      brightYellow: '#657b83',
      brightBlue: '#839496',
      brightMagenta: '#6c71c4',
      brightCyan: '#93a1a1',
      brightWhite: '#fdf6e3',
    },
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dark theme with vibrant colors',
    colors: {
      background: 'hsl(231, 15%, 18%)',
      foreground: 'hsl(60, 30%, 96%)',
      card: 'hsl(232, 14%, 21%)',
      cardForeground: 'hsl(60, 30%, 96%)',
      popover: 'hsl(232, 14%, 21%)',
      popoverForeground: 'hsl(60, 30%, 96%)',
      primary: 'hsl(265, 89%, 78%)',
      primaryForeground: 'hsl(231, 15%, 18%)',
      secondary: 'hsl(232, 14%, 31%)',
      secondaryForeground: 'hsl(60, 30%, 96%)',
      muted: 'hsl(232, 14%, 31%)',
      mutedForeground: 'hsl(225, 27%, 51%)',
      accent: 'hsl(326, 100%, 74%)',
      accentForeground: 'hsl(231, 15%, 18%)',
      destructive: 'hsl(0, 100%, 67%)',
      destructiveForeground: 'hsl(231, 15%, 18%)',
      border: 'hsl(232, 14%, 31%)',
      input: 'hsl(232, 14%, 31%)',
      ring: 'hsl(265, 89%, 78%)',
    },
    editor: {
      theme: 'vs-dark',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
    terminal: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      selection: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
  },
  monokai: {
    id: 'monokai',
    name: 'Monokai',
    description: 'Classic Monokai color scheme',
    colors: {
      background: 'hsl(70, 8%, 15%)',
      foreground: 'hsl(60, 36%, 96%)',
      card: 'hsl(70, 8%, 18%)',
      cardForeground: 'hsl(60, 36%, 96%)',
      popover: 'hsl(70, 8%, 18%)',
      popoverForeground: 'hsl(60, 36%, 96%)',
      primary: 'hsl(80, 76%, 53%)',
      primaryForeground: 'hsl(70, 8%, 15%)',
      secondary: 'hsl(70, 8%, 25%)',
      secondaryForeground: 'hsl(60, 36%, 96%)',
      muted: 'hsl(70, 8%, 25%)',
      mutedForeground: 'hsl(60, 7%, 58%)',
      accent: 'hsl(338, 95%, 56%)',
      accentForeground: 'hsl(60, 36%, 96%)',
      destructive: 'hsl(5, 74%, 59%)',
      destructiveForeground: 'hsl(60, 36%, 96%)',
      border: 'hsl(70, 8%, 30%)',
      input: 'hsl(70, 8%, 30%)',
      ring: 'hsl(80, 76%, 53%)',
    },
    editor: {
      theme: 'vs-dark',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
    terminal: {
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      selection: '#49483e',
      black: '#272822',
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#f4bf75',
      blue: '#66d9ef',
      magenta: '#ae81ff',
      cyan: '#a1efe4',
      white: '#f8f8f2',
      brightBlack: '#75715e',
      brightRed: '#f92672',
      brightGreen: '#a6e22e',
      brightYellow: '#f4bf75',
      brightBlue: '#66d9ef',
      brightMagenta: '#ae81ff',
      brightCyan: '#a1efe4',
      brightWhite: '#f9f8f5',
    },
  },
  githubDark: {
    id: 'githubDark',
    name: 'GitHub Dark',
    description: 'GitHub\'s dark theme',
    colors: {
      background: 'hsl(215, 28%, 7%)',
      foreground: 'hsl(210, 12%, 82%)',
      card: 'hsl(215, 21%, 11%)',
      cardForeground: 'hsl(210, 12%, 82%)',
      popover: 'hsl(215, 21%, 11%)',
      popoverForeground: 'hsl(210, 12%, 82%)',
      primary: 'hsl(212, 92%, 45%)',
      primaryForeground: 'hsl(0, 0%, 100%)',
      secondary: 'hsl(215, 15%, 18%)',
      secondaryForeground: 'hsl(210, 12%, 82%)',
      muted: 'hsl(215, 15%, 18%)',
      mutedForeground: 'hsl(215, 8%, 47%)',
      accent: 'hsl(212, 92%, 45%)',
      accentForeground: 'hsl(0, 0%, 100%)',
      destructive: 'hsl(0, 72%, 51%)',
      destructiveForeground: 'hsl(0, 0%, 100%)',
      border: 'hsl(215, 15%, 22%)',
      input: 'hsl(215, 15%, 22%)',
      ring: 'hsl(212, 92%, 45%)',
    },
    editor: {
      theme: 'vs-dark',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      fontSize: 14,
      lineHeight: 1.5,
    },
    terminal: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      cursor: '#c9d1d9',
      selection: '#3392ff44',
      black: '#484f58',
      red: '#ff7b72',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#b1bac4',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc',
    },
  },
};

export interface UISettings {
  density: 'compact' | 'normal' | 'comfortable';
  sidebarPosition: 'left' | 'right';
  showStatusBar: boolean;
  showActivityBar: boolean;
  fontFamily: string;
  customCSS: string;
}

export const defaultUISettings: UISettings = {
  density: 'normal',
  sidebarPosition: 'left',
  showStatusBar: true,
  showActivityBar: true,
  fontFamily: 'Inter, system-ui, sans-serif',
  customCSS: '',
};