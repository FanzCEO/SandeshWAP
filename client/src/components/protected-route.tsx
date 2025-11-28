import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/providers/auth-provider';
import { LoadingSpinner } from '@/components/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // true = requires authentication, false = requires no auth (for login/signup pages)
  redirectTo?: string;
}

export function ProtectedRoute({ children, requireAuth = true, redirectTo }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return; // Wait for auth check to complete

    if (requireAuth && !isAuthenticated) {
      // User needs to be authenticated but isn't - redirect to auth
      setLocation(redirectTo || '/auth/welcome');
    } else if (!requireAuth && isAuthenticated) {
      // User is authenticated but shouldn't access this page (e.g., login/signup) - redirect to app
      setLocation(redirectTo || '/');
    }
  }, [isLoading, isAuthenticated, requireAuth, redirectTo, setLocation]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render anything if redirecting
  if ((requireAuth && !isAuthenticated) || (!requireAuth && isAuthenticated)) {
    return null;
  }

  return <>{children}</>;
}