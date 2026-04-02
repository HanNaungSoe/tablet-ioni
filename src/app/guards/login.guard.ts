import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { DeviceAccessService } from '../services/device-access.service';
import { LoginService } from '../services/login.service';

export const loginGuard: CanMatchFn = () => {
  const router = inject(Router);
  const deviceAccessService = inject(DeviceAccessService);
  const loginService = inject(LoginService);

  if (!deviceAccessService.hasCheckedAccess) {
    return router.createUrlTree(['/startup']);
  }

  if (!deviceAccessService.isAllowed) {
    return router.createUrlTree(['/not-found']);
  }

  if (loginService.isLoggedIn) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
