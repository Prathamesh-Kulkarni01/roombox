'use client';

import React from 'react';
import { Permission } from '@/types/permissions';
import { can } from '@/lib/permissions-core';

interface PermissionGuardProps {
  // The required permission to view/interact with the children
  requiredPermission: Permission;
  // The permissions array of the current user. Pushed in explicitly for simplicity and SSG support.
  userPermissions: Permission[] | undefined | null; 
  // What to do when permission is denied. Default is complete removal.
  fallbackMode?: 'hidden' | 'readonly' | 'custom';
  // If 'readonly', optionally wrap children in something specific or use the default styling
  readOnlyComponent?: React.ReactNode;
  // If 'custom', what to render instead of children
  customFallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * A UI guard wrapper used to conditionally render elements based on user permissions
 * 
 * Example usage:
 * <PermissionGuard 
 *    requiredPermission={PERMISSIONS.properties.edit} 
 *    userPermissions={session.permissions} 
 *    fallbackMode="readonly"
 * >
 *    <EditPropertyForm />
 * </PermissionGuard>
 */
export function PermissionGuard({
  requiredPermission,
  userPermissions,
  fallbackMode = 'hidden',
  readOnlyComponent,
  customFallback,
  children
}: PermissionGuardProps) {
  
  const hasAccess = can(userPermissions, requiredPermission);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle denied states
  if (fallbackMode === 'readonly') {
    // Opacity and pointer block provides a quick client-side readonly mode
    return (
      <div className="opacity-70 pointer-events-none select-none relative" aria-disabled="true">
        {readOnlyComponent || children}
      </div>
    );
  }

  if (fallbackMode === 'custom' && customFallback) {
    return <>{customFallback}</>;
  }

  // Default fallbackmode 'hidden'
  return null;
}
