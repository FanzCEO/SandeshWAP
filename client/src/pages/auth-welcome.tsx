import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthWelcome() {
  const [_, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<'creator' | 'fan' | null>(null);

  const handleRoleSelect = (role: 'creator' | 'fan') => {
    setSelectedRole(role);
    setTimeout(() => {
      setLocation(`/auth/${role}/signup`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
          >
            Welcome to Sandesh WAP
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-muted-foreground"
          >
            Choose your path and start your journey
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Creator Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className={`transition-all duration-300 ${
              selectedRole === 'creator' ? 'ring-4 ring-primary' : ''
            }`}
          >
            <Card className="h-full bg-gradient-to-br from-card via-card to-muted/20 border-2 hover:border-primary/50 cursor-pointer backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                  <i className="fas fa-star text-3xl text-primary"></i>
                </div>
                <CardTitle className="text-3xl mb-2">I'm a Creator</CardTitle>
                <CardDescription className="text-base">
                  Share your talent, build your community, keep 100% of earnings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-check text-xs text-primary"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">100% Earnings</p>
                      <p className="text-xs text-muted-foreground">Keep every dollar you make</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-check text-xs text-primary"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Content Ownership</p>
                      <p className="text-xs text-muted-foreground">You own everything you create</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-check text-xs text-primary"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Advanced Tools</p>
                      <p className="text-xs text-muted-foreground">Professional creator dashboard</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleRoleSelect('creator')}
                  className="w-full mt-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  data-testid="button-creator-signup"
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Claim Your Star Power
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Fan Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            className={`transition-all duration-300 ${
              selectedRole === 'fan' ? 'ring-4 ring-primary' : ''
            }`}
          >
            <Card className="h-full bg-gradient-to-br from-card via-card to-muted/20 border-2 hover:border-purple-500/50 cursor-pointer backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/20 to-purple-500/10 flex items-center justify-center mb-4">
                  <i className="fas fa-heart text-3xl text-purple-500"></i>
                </div>
                <CardTitle className="text-3xl mb-2">I'm a Fan</CardTitle>
                <CardDescription className="text-base">
                  Discover amazing creators and support their journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-check text-xs text-purple-500"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Exclusive Content</p>
                      <p className="text-xs text-muted-foreground">Access creator-only posts</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-check text-xs text-purple-500"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Direct Connection</p>
                      <p className="text-xs text-muted-foreground">Chat and interact with creators</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="fas fa-check text-xs text-purple-500"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Personalized Feed</p>
                      <p className="text-xs text-muted-foreground">Content tailored to you</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleRoleSelect('fan')}
                  variant="outline"
                  className="w-full mt-6 border-purple-500/50 hover:bg-purple-500/10 hover:border-purple-500"
                  data-testid="button-fan-signup"
                >
                  <i className="fas fa-compass mr-2"></i>
                  Start Discovering
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => setLocation('/auth/login')}
              data-testid="link-login"
            >
              Sign in
            </Button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}