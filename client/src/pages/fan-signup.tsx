import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { signUpSchema } from '@shared/schema';
import { z } from 'zod';

const INTEREST_OPTIONS = [
  'Art & Photography', 'Music & Audio', 'Fitness & Health', 'Gaming',
  'Cooking & Food', 'Fashion & Beauty', 'Tech & Dev', 'Education',
  'Lifestyle', 'Adult Content', 'Entertainment', 'Business'
];

export default function FanSignup() {
  const [_, setLocation] = useLocation();
  const { signUp, updateProfile, updateOnboarding } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState('');

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  // Step 1: Account Creation
  const accountForm = useForm({
    resolver: zodResolver(signUpSchema.extend({
      confirmPassword: z.string().min(8)
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'fan' as const
    }
  });

  const handleStep1Submit = async (data: any) => {
    try {
      setIsLoading(true);
      await signUp({
        username: data.username,
        email: data.email,
        password: data.password,
        role: 'fan',
        birthday: birthdayInput || undefined
      });

      setCurrentStep(2);

      toast({
        title: 'Account Created! ✨',
        description: 'Welcome to Sandesh WAP. Let\'s personalize your experience.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async () => {
    try {
      setIsLoading(true);
      await updateProfile({
        interests: selectedInterests
      });
      await updateOnboarding(2);

      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save interests',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Skip = async () => {
    await updateOnboarding(3);
    setCurrentStep(4);
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await updateOnboarding(5, true);

      toast({
        title: 'Welcome to Sandesh WAP! 🎉',
        description: 'Your fan account is all set up!',
      });

      setTimeout(() => {
        setLocation('/');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="bg-card/95 backdrop-blur-sm border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500/20 to-purple-500/10 flex items-center justify-center">
                  <i className="fas fa-heart text-xl text-purple-500"></i>
                </div>
                <div>
                  <CardTitle className="text-2xl">Fan Sign Up</CardTitle>
                  <CardDescription>Step {currentStep} of {totalSteps}</CardDescription>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {/* Step 1: Account Creation */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">Start Discovering</h3>
                    <p className="text-muted-foreground">Create your fan account</p>
                  </div>

                  <Form {...accountForm}>
                    <form onSubmit={accountForm.handleSubmit(handleStep1Submit)} className="space-y-4">
                      <FormField
                        control={accountForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="yourusername" {...field} data-testid="input-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div>
                        <Label htmlFor="birthday">Birthday (Optional)</Label>
                        <Input
                          id="birthday"
                          type="date"
                          value={birthdayInput}
                          onChange={(e) => setBirthdayInput(e.target.value)}
                          className="mt-2"
                          data-testid="input-birthday"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Required for age-restricted content (18+)
                        </p>
                      </div>

                      <FormField
                        control={accountForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={accountForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} data-testid="input-confirm-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full mt-6"
                        disabled={isLoading}
                        data-testid="button-continue-step1"
                      >
                        {isLoading ? 'Creating Account...' : 'Continue'}
                        <i className="fas fa-arrow-right ml-2"></i>
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* Step 2: Interest Selection */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">What Are You Into?</h3>
                    <p className="text-muted-foreground">Pick your interests (select 1 or more)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {INTEREST_OPTIONS.map(interest => (
                      <Badge
                        key={interest}
                        variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                        className="cursor-pointer p-3 justify-center hover:scale-105 transition-transform"
                        onClick={() => toggleInterest(interest)}
                        data-testid={`badge-interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {selectedInterests.includes(interest) && <i className="fas fa-check mr-2"></i>}
                        {interest}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={handleStep2Submit}
                      className="flex-1"
                      disabled={isLoading || selectedInterests.length === 0}
                      data-testid="button-continue-step2"
                    >
                      {isLoading ? 'Saving...' : 'Continue'}
                      <i className="fas fa-arrow-right ml-2"></i>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment Setup (Optional) */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500/20 to-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-credit-card text-4xl text-green-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Payment Method</h3>
                    <p className="text-muted-foreground">
                      Add a payment method to support creators instantly
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-6 text-center space-y-4">
                    <i className="fas fa-lock text-3xl text-muted-foreground/50"></i>
                    <div className="space-y-2">
                      <p className="font-semibold">Secure & Private</p>
                      <p className="text-sm text-muted-foreground">
                        Your payment information is encrypted and never shared.
                        <br />
                        You can add this later from Settings → Payments.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleStep3Skip}
                      className="flex-1"
                      variant="outline"
                      data-testid="button-skip-step3"
                    >
                      Add Later
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Feed Preview */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">Your Personalized Feed</h3>
                    <p className="text-muted-foreground">
                      Based on your interests, you'll see amazing creators
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedInterests.slice(0, 3).map((interest, index) => (
                      <div key={interest} className="bg-muted/30 rounded-lg p-4 flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">Creators in {interest}</p>
                          <p className="text-xs text-muted-foreground">
                            Discover amazing content creators
                          </p>
                        </div>
                        <Badge variant="outline">
                          <i className="fas fa-star text-yellow-500 mr-1"></i>
                          Featured
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                    <i className="fas fa-info-circle text-primary mr-2"></i>
                    <span className="text-sm">
                      You can customize your feed anytime in Settings
                    </span>
                  </div>

                  <Button
                    onClick={() => setCurrentStep(5)}
                    className="w-full"
                    data-testid="button-continue-step4"
                  >
                    Continue
                    <i className="fas fa-arrow-right ml-2"></i>
                  </Button>
                </motion.div>
              )}

              {/* Step 5: Welcome & Complete */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-purple-500/80 flex items-center justify-center mx-auto mb-6"
                  >
                    <i className="fas fa-check text-5xl text-white"></i>
                  </motion.div>

                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-500/70 bg-clip-text text-transparent">
                      Ready to Explore!
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Welcome to Sandesh WAP! 🎉
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-6 space-y-3 text-left max-w-md mx-auto">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-compass text-purple-500 mt-1"></i>
                      <div>
                        <p className="font-semibold text-sm">Discover Creators</p>
                        <p className="text-xs text-muted-foreground">Explore your personalized feed</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-comment text-purple-500 mt-1"></i>
                      <div>
                        <p className="font-semibold text-sm">Connect & Support</p>
                        <p className="text-xs text-muted-foreground">Interact directly with creators</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-heart text-purple-500 mt-1"></i>
                      <div>
                        <p className="font-semibold text-sm">Access Exclusive Content</p>
                        <p className="text-xs text-muted-foreground">Subscribe to your favorite creators</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleComplete}
                    size="lg"
                    className="mt-8"
                    disabled={isLoading}
                    data-testid="button-complete"
                  >
                    {isLoading ? 'Setting up...' : 'Start Exploring'}
                    <i className="fas fa-arrow-right ml-2"></i>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => setLocation('/auth/welcome')}
            data-testid="link-back-welcome"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to welcome
          </Button>
        </div>
      </motion.div>
    </div>
  );
}