import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { CommandProvider } from "@/providers/command-provider";
import { ProtectedRoute } from "@/components/protected-route";
import IDE from "@/pages/ide";
import AuthWelcome from "@/pages/auth-welcome";
import CreatorSignup from "@/pages/creator-signup";
import FanSignup from "@/pages/fan-signup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth/welcome">
        <ProtectedRoute requireAuth={false}>
          <AuthWelcome />
        </ProtectedRoute>
      </Route>
      <Route path="/auth/creator/signup">
        <ProtectedRoute requireAuth={false}>
          <CreatorSignup />
        </ProtectedRoute>
      </Route>
      <Route path="/auth/fan/signup">
        <ProtectedRoute requireAuth={false}>
          <FanSignup />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute requireAuth={true}>
          <IDE />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <CommandProvider>
              <Toaster />
              <Router />
            </CommandProvider>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
