import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { DeviceAccessService } from '../services/device-access.service';

export const deviceAccessGuard: CanMatchFn = () => {
  const router = inject(Router);
  const deviceAccessService = inject(DeviceAccessService);

  if (!deviceAccessService.hasCheckedAccess) {
    return router.createUrlTree(['/startup']);
  }

  if (deviceAccessService.isAllowed) {
    return true;
  }

  return router.createUrlTree(['/not-found']);
};
