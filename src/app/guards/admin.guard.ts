import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';

export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Check JWT Token
  const hasToken = !!authService.accessToken();
  const user = authService.currentUser();

  // Check if role is admin
  if (hasToken && user && user.role === 'admin') {
    return true;
  }

  // Redirect to login if unauthorized
  return router.parseUrl('/login');
};
