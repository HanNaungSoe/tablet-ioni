import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable, Subscription } from 'rxjs';
import { Network, type ConnectionStatus } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class NetworkService implements OnDestroy {
  private readonly online$ = new BehaviorSubject<boolean>(navigator.onLine);
  private readonly subscription: Subscription;
  private nativeListener: PluginListenerHandle | null = null;

  constructor() {
    this.subscription = merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe(() => {
      this.online$.next(navigator.onLine);
    });

    void this.initNativeListener();
  }

  get isOnline$(): Observable<boolean> {
    return this.online$.asObservable();
  }

  get isOnline(): boolean {
    return this.online$.value;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    void this.nativeListener?.remove();
  }

  private async initNativeListener(): Promise<void> {
    try {
      const status: ConnectionStatus = await Network.getStatus();
      this.online$.next(status.connected);

      this.nativeListener = await Network.addListener('networkStatusChange', (next: ConnectionStatus) => {
        this.online$.next(next.connected);
      });
    } catch {
      // Fallback to browser events only.
    }
  }
}
