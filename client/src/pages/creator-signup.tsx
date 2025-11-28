import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { signUpSchema } from '@shared/schema';
import type { SignUpData } from '@shared/schema';
import { z } from 'zod';

const NICHE_OPTIONS = [
  'Art & Photography', 'Music & Audio', 'Fitness & Health', 'Gaming', 
  'Cooking & Food', 'Fashion & Beauty', 'Tech & Dev', 'Education',
  'Lifestyle', 'Adult Content', 'Entertainment', 'Business'
];

const PRONOUN_OPTIONS = ['he/him', 'she/her', 'they/them', 'other', 'prefer not to say'];

export default function CreatorSignup() {
  const [_, setLocation] = useLocation();
  const { signUp, updateProfile, updateOnboarding } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({});
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 6;
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
      role: 'creator' as const
    }
  });

  // Step 2: Profile Setup
  const profileForm = useForm({
    defaultValues: {
      displayName: '',
      stageName: '',
      pronouns: '',
      bio: ''
    }
  });

  const handleStep1Submit = async (data: any) => {
    try {
      setIsLoading(true);
      await signUp({
        username: data.username,
        email: data.email,
        password: data.password,
        role: 'creator'
      });
      
      setFormData({ ...formData, ...data });
      setCurrentStep(2);
      
      toast({
        title: 'Account Created! ✨',
        description: 'Welcome to Sandesh WAP. Let\'s set up your creator profile.',
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

  const handleStep2Submit = async (data: any) => {
    try {
      setIsLoading(true);
      await updateProfile({
        displayName: data.displayName,
        stageName: data.stageName,
        pronouns: data.pronouns,
        bio: data.bio
      });
      await updateOnboarding(2);
      
      setFormData({ ...formData, ...data });
      setCurrentStep(3);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    try {
      setIsLoading(true);
      await updateProfile({
        niche: selectedNiches
      });
      await updateOnboarding(3);
      
      setCurrentStep(4);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save niches',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4Skip = async () => {
    await updateOnboarding(4);
    setCurrentStep(5);
  };

  const handleStep5Skip = async () => {
    await updateOnboarding(5);
    setCurrentStep(6);
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await updateOnboarding(6, true);
      
      toast({
        title: 'Welcome to Sandesh WAP! 🎉',
        description: 'Your creator account is all set up!',
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

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev =>
      prev.includes(niche)
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
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
        className="w-full max-w-2xl relative z-10"
      >
        <Card className="bg-card/95 backdrop-blur-sm border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                  <i className="fas fa-star text-xl text-primary"></i>
                </div>
                <div>
                  <CardTitle className="text-2xl">Creator Sign Up</CardTitle>
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
                    <h3 className="text-2xl font-bold mb-2">Claim Your Star Power</h3>
                    <p className="text-muted-foreground">Create your creator account</p>
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
                              <Input placeholder="yourcreatorname" {...field} data-testid="input-username" />
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

              {/* Step 2: Profile Setup */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">Set Up Your Profile</h3>
                    <p className="text-muted-foreground">Tell us about yourself</p>
                  </div>

                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleStep2Submit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} data-testid="input-display-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="stageName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stage Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Your stage/creator name" {...field} data-testid="input-stage-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="pronouns"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pronouns (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-pronouns">
                                  <SelectValue placeholder="Select pronouns" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PRONOUN_OPTIONS.map(pronoun => (
                                  <SelectItem key={pronoun} value={pronoun}>{pronoun}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell your fans about yourself..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-bio"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentStep(1)}
                          disabled={isLoading}
                        >
                          <i className="fas fa-arrow-left mr-2"></i>
                          Back
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={isLoading}
                          data-testid="button-continue-step2"
                        >
                          {isLoading ? 'Saving...' : 'Continue'}
                          <i className="fas fa-arrow-right ml-2"></i>
                        </Button>
                      </div>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* Step 3: Niche Selection */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">Choose Your Niches</h3>
                    <p className="text-muted-foreground">Help fans find you (select 1-3)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {NICHE_OPTIONS.map(niche => (
                      <Badge
                        key={niche}
                        variant={selectedNiches.includes(niche) ? 'default' : 'outline'}
                        className="cursor-pointer p-3 justify-center hover:scale-105 transition-transform"
                        onClick={() => toggleNiche(niche)}
                        data-testid={`badge-niche-${niche.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {selectedNiches.includes(niche) && <i className="fas fa-check mr-2"></i>}
                        {niche}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                      disabled={isLoading}
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Back
                    </Button>
                    <Button
                      onClick={handleStep3Submit}
                      className="flex-1"
                      disabled={isLoading || selectedNiches.length === 0}
                      data-testid="button-continue-step3"
                    >
                      {isLoading ? 'Saving...' : 'Continue'}
                      <i className="fas fa-arrow-right ml-2"></i>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Verification (Placeholder for now) */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-shield-check text-4xl text-primary"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Verification</h3>
                    <p className="text-muted-foreground">
                      ID verification helps keep the platform safe for everyone
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-6 text-center space-y-4">
                    <i className="fas fa-id-card text-5xl text-muted-foreground/50"></i>
                    <p className="text-sm text-muted-foreground">
                      Verification can be completed later from your settings.
                      <br />
                      Verified creators get a badge and higher visibility!
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(3)}
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Back
                    </Button>
                    <Button
                      onClick={handleStep4Skip}
                      className="flex-1"
                      variant="outline"
                      data-testid="button-skip-step4"
                    >
                      Complete Later
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Monetization (Placeholder) */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500/20 to-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-dollar-sign text-4xl text-green-500"></i>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">100% Yours</h3>
                    <p className="text-muted-foreground">
                      Keep every dollar you earn. No platform fees!
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Platform Fee</span>
                      <span className="text-lg font-bold text-green-500">0%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Your Earnings</span>
                      <span className="text-lg font-bold text-green-500">100%</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-4 border-t">
                      Set up your payout method anytime from Settings → Payments
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(4)}
                    >
                      <i className="fas fa-arrow-left mr-2"></i>
                      Back
                    </Button>
                    <Button
                      onClick={handleStep5Skip}
                      className="flex-1"
                      data-testid="button-continue-step5"
                    >
                      Continue
                      <i className="fas fa-arrow-right ml-2"></i>
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 6: Welcome & Complete */}
              {currentStep === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6 text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="w-24 h-24 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center mx-auto mb-6"
                  >
                    <i className="fas fa-check text-5xl text-white"></i>
                  </motion.div>

                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      You're All Set!
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Welcome to Sandesh WAP, creator! 🎉
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-6 space-y-3 text-left max-w-md mx-auto">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-rocket text-primary mt-1"></i>
                      <div>
                        <p className="font-semibold text-sm">Start Creating</p>
                        <p className="text-xs text-muted-foreground">Upload your first post and connect with fans</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-users text-primary mt-1"></i>
                      <div>
                        <p className="font-semibold text-sm">Build Your Community</p>
                        <p className="text-xs text-muted-foreground">Engage with fans and grow your following</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-money-bill-wave text-primary mt-1"></i>
                      <div>
                        <p className="font-semibold text-sm">Earn 100%</p>
                        <p className="text-xs text-muted-foreground">Keep all your earnings, zero platform fees</p>
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
                    {isLoading ? 'Setting up...' : 'Go to Dashboard'}
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