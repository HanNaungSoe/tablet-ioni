import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DeviceAccessService {
  private readonly accessAllowedSubject = new BehaviorSubject<boolean>(false);
  private readonly accessCheckedSubject = new BehaviorSubject<boolean>(false);

  readonly accessAllowed$ = this.accessAllowedSubject.asObservable();
  readonly accessChecked$ = this.accessCheckedSubject.asObservable();

  get isAllowed(): boolean {
    return this.accessAllowedSubject.value;
  }

  get hasCheckedAccess(): boolean {
    return this.accessCheckedSubject.value;
  }

  get isBlocked(): boolean {
    return this.hasCheckedAccess && !this.isAllowed;
  }

  beginCheck(): void {
    this.accessCheckedSubject.next(false);
    this.accessAllowedSubject.next(false);
  }

  allow(): void {
    this.accessAllowedSubject.next(true);
    this.accessCheckedSubject.next(true);
  }

  block(): void {
    this.accessAllowedSubject.next(false);
    this.accessCheckedSubject.next(true);
  }

  reset(): void {
    // Later we can extend this flow with richer app states if the backend returns more than allowed/not-allowed.
    this.accessAllowedSubject.next(false);
    this.accessCheckedSubject.next(false);
  }
}
