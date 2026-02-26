import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewMode } from '@/contexts/PreviewModeContext';
import { Loader2 } from 'lucide-react';

type AppRole = 'client' | 'support' | 'admin' | 'ops';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, hasRole, primaryRole } = useAuth();
  const { isPreviewMode } = usePreviewMode();

  // In preview mode, bypass authentication completely
  if (isPreviewMode) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, check them
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some((role) => hasRole(role));
    if (!hasAllowedRole) {
      // Redirect to their primary role's dashboard
      if (primaryRole) {
        return <Navigate to={`/${primaryRole}`} replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
