import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Rocket, FolderOpen, FolderPlus, GitBranch, 
  Clock, Keyboard, Command, Code, Terminal,
  Sparkles, ArrowRight, Play, BookOpen
} from 'lucide-react';

interface WelcomeScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAction: (action: 'new' | 'open' | 'clone') => void;
  recentProjects?: Array<{
    name: string;
    path: string;
    lastOpened: string;
  }>;
}

export function WelcomeScreen({ isOpen, onClose, onProjectAction, recentProjects = [] }: WelcomeScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const shortcuts = [
    { keys: ['⌘', 'S'], description: 'Save File' },
    { keys: ['⌘', 'P'], description: 'Quick Open' },
    { keys: ['⌘', 'Shift', 'F'], description: 'Global Search' },
    { keys: ['⌘', ','], description: 'Settings' },
    { keys: ['Alt', 'Shift', 'F'], description: 'Format Code' },
    { keys: ['F1'], description: 'Show Shortcuts' },
  ];

  const features = [
    { icon: Code, title: 'Intelligent Code Editor', description: 'Monaco-powered with syntax highlighting' },
    { icon: Terminal, title: 'Integrated Terminal', description: 'Full shell access in your browser' },
    { icon: GitBranch, title: 'Version Control', description: 'Built-in Git support' },
    { icon: Sparkles, title: 'AI Assistance', description: 'Smart code suggestions and help' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-lg"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-6xl h-[85vh] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-600/10 to-blue-600/10 rounded-2xl" />
              <div className="absolute inset-0 mesh-gradient opacity-30 rounded-2xl" />
            </div>

            {/* Glass card container */}
            <div className="glass-card h-full rounded-2xl p-8 overflow-y-auto">
              {/* Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-center mb-8"
              >
                <div className="flex justify-center mb-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                    className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl"
                  >
                    <Rocket className="text-primary-foreground text-3xl" />
                  </motion.div>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                  Welcome to Sandesh WAP
                </h1>
                <p className="text-muted-foreground text-lg">
                  Your professional web-based development environment
                </p>
              </motion.div>

              {/* Main content grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Quick Actions */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-1"
                >
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Quick Start
                  </h2>
                  <div className="space-y-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className="w-full justify-start gap-3 h-12 gradient-border hover-glow"
                        variant="outline"
                        onClick={() => onProjectAction('new')}
                        data-testid="button-new-project"
                      >
                        <FolderPlus className="w-5 h-5" />
                        <span>Create New Project</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className="w-full justify-start gap-3 h-12 gradient-border hover-glow"
                        variant="outline"
                        onClick={() => onProjectAction('open')}
                        data-testid="button-open-project"
                      >
                        <FolderOpen className="w-5 h-5" />
                        <span>Open Existing Project</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        className="w-full justify-start gap-3 h-12 gradient-border hover-glow"
                        variant="outline"
                        onClick={() => onProjectAction('clone')}
                        data-testid="button-clone-repo"
                      >
                        <GitBranch className="w-5 h-5" />
                        <span>Clone Repository</span>
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Recent Projects */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-1"
                >
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Recent Projects
                  </h2>
                  <div className="space-y-2">
                    {recentProjects.length > 0 ? (
                      recentProjects.slice(0, 5).map((project, index) => (
                        <motion.div
                          key={project.path}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          whileHover={{ x: 5 }}
                          className="p-3 rounded-lg bg-card/50 hover:bg-card cursor-pointer transition-all"
                          data-testid={`recent-project-${index}`}
                        >
                          <div className="flex items-center gap-3">
                            <FolderOpen className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{project.path}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No recent projects</p>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Keyboard Shortcuts */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="lg:col-span-1"
                >
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Keyboard className="w-5 h-5 text-primary" />
                    Keyboard Shortcuts
                  </h2>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, keyIndex) => (
                            <kbd
                              key={keyIndex}
                              className="px-2 py-1 text-xs font-semibold text-foreground bg-muted rounded border border-border"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Features */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Features
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      whileHover={{ y: -5 }}
                    >
                      <Card className="h-full glass-card hover-glow">
                        <CardHeader className="pb-3">
                          <feature.icon className="w-8 h-8 mb-2 text-primary" />
                          <CardTitle className="text-base">{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-xs">
                            {feature.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 text-center"
              >
                <Button
                  onClick={handleClose}
                  className="animated-gradient-bg text-white font-semibold px-8 py-2 hover-lift"
                  data-testid="button-get-started"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">ESC</kbd> to close
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}