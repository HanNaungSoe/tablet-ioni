import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NetworkService implements OnDestroy {
  private readonly online$ = new BehaviorSubject<boolean>(navigator.onLine);
  private readonly subscription: Subscription;

  constructor() {
    this.subscription = merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe(() => {
      this.online$.next(navigator.onLine);
    });
  }

  get isOnline$(): Observable<boolean> {
    return this.online$.asObservable();
  }

  get isOnline(): boolean {
    return this.online$.value;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
