import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  session: any;
  profile: any;
  requireTenant?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ 
  session, 
  profile, 
  requireTenant = true,
  children 
}: ProtectedRouteProps) {
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If requireTenant is true, we must have a profile with a tenant_id
  // Note: profile might be null temporarily while loading, but App.tsx handles the loading state
  if (requireTenant && profile && !profile.tenant_id) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
