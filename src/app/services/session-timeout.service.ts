import { Injectable, OnDestroy } from '@angular/core';
import { App as CapacitorApp, type AppState } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { ToastController } from '@ionic/angular';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SessionTimeoutService implements OnDestroy {
  private readonly lastActivityStorageKey = 'tablet-session-last-activity-at';
  private readonly backgroundedAtStorageKey = 'tablet-session-backgrounded-at';
  private readonly defaultTimeoutMins = 3;

  private readonly expiredSubject = new Subject<string>();
  private appStateListener: PluginListenerHandle | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private warningToast: HTMLIonToastElement | null = null;
  private sessionActive = false;
  private foregroundTrackingEnabled = true;
  private currentTimeoutMs = this.defaultTimeoutMins * 60 * 1000;
  private currentWarningMs = this.buildWarningMs(this.currentTimeoutMs);
  private usingBackendTimeout = false;

  constructor(private readonly toastController: ToastController) {
    void this.registerAppStateListener();
  }

  get expired$(): Observable<string> {
    return this.expiredSubject.asObservable();
  }

  get shouldPauseWhileWebViewOpen(): boolean {
    return this.usingBackendTimeout;
  }

  // Start or restore the current session using the timeout returned by login.
  bindToActiveSession(timeoutMins?: number, resetActivity = false): void {
    this.sessionActive = true;
    this.usingBackendTimeout = this.isValidTimeoutMins(timeoutMins);
    this.currentTimeoutMs = this.normalizeTimeoutMs(timeoutMins);
    this.currentWarningMs = this.buildWarningMs(this.currentTimeoutMs);

    if (resetActivity || !this.readTimestamp(this.lastActivityStorageKey)) {
      this.writeTimestamp(this.lastActivityStorageKey, Date.now());
    }

    const backgroundedAt = this.readTimestamp(this.backgroundedAtStorageKey);
    if (backgroundedAt && Date.now() - backgroundedAt >= this.currentTimeoutMs) {
      this.emitExpiration('Your session expired while the app was in the background.');
      return;
    }

    this.clearTimestamp(this.backgroundedAtStorageKey);
    this.scheduleTimers();
  }

  // Fully clear all local timeout state when the user logs out.
  stopSession(): void {
    this.sessionActive = false;
    this.foregroundTrackingEnabled = true;
    this.usingBackendTimeout = false;
    this.clearTimers();
    this.clearTimestamp(this.lastActivityStorageKey);
    this.clearTimestamp(this.backgroundedAtStorageKey);
    void this.dismissWarningToast();
  }

  // Any foreground interaction should refresh the last-activity time.
  recordActivity(): void {
    if (!this.sessionActive) {
      return;
    }

    this.writeTimestamp(this.lastActivityStorageKey, Date.now());
    this.clearTimestamp(this.backgroundedAtStorageKey);

    if (this.foregroundTrackingEnabled) {
      this.scheduleTimers();
    }
  }

  // Pause foreground idle timers while the user is inside the native webview.
  setForegroundTrackingEnabled(enabled: boolean): void {
    this.foregroundTrackingEnabled = enabled;

    if (!this.sessionActive) {
      return;
    }

    if (!enabled) {
      this.clearTimers();
      void this.dismissWarningToast();
      return;
    }

    this.scheduleTimers();
  }

  ngOnDestroy(): void {
    this.clearTimers();
    void this.dismissWarningToast();
    void this.appStateListener?.remove();
  }

  private async registerAppStateListener(): Promise<void> {
    try {
      this.appStateListener = await CapacitorApp.addListener('appStateChange', (state: AppState) => {
        void this.handleAppStateChange(state);
      });
    } catch {
      // Browser/dev mode can rely on foreground timers only.
    }
  }

  // On mobile resume, compare elapsed background time against the server timeout.
  private async handleAppStateChange(state: AppState): Promise<void> {
    if (!this.sessionActive) {
      return;
    }

    if (!state.isActive) {
      this.writeTimestamp(this.backgroundedAtStorageKey, Date.now());
      return;
    }

    const backgroundedAt = this.readTimestamp(this.backgroundedAtStorageKey);
    this.clearTimestamp(this.backgroundedAtStorageKey);

    if (backgroundedAt && Date.now() - backgroundedAt >= this.currentTimeoutMs) {
      this.emitExpiration('Your session expired while the app was in the background.');
      return;
    }

    if (this.foregroundTrackingEnabled) {
      this.scheduleTimers();
    }
  }

  // Rebuild both the warning timer and the final expiration timer from last activity.
  private scheduleTimers(): void {
    if (!this.sessionActive || !this.foregroundTrackingEnabled) {
      return;
    }

    const lastActivityAt = this.readTimestamp(this.lastActivityStorageKey) ?? Date.now();
    const elapsedMs = Date.now() - lastActivityAt;
    const remainingMs = this.currentTimeoutMs - elapsedMs;

    this.clearTimers();

    if (remainingMs <= 0) {
      this.emitExpiration('Your session expired due to inactivity.');
      return;
    }

    const warningDelayMs = remainingMs - this.currentWarningMs;
    if (warningDelayMs <= 0) {
      void this.presentWarningToast();
    } else {
      this.warningTimer = setTimeout(() => {
        void this.presentWarningToast();
      }, warningDelayMs);
    }

    this.logoutTimer = setTimeout(() => {
      this.emitExpiration('Your session expired due to inactivity.');
    }, remainingMs);
  }

  private clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }

  private emitExpiration(message: string): void {
    if (!this.sessionActive) {
      return;
    }

    this.sessionActive = false;
    this.clearTimers();
    this.clearTimestamp(this.lastActivityStorageKey);
    this.clearTimestamp(this.backgroundedAtStorageKey);
    void this.dismissWarningToast();
    this.expiredSubject.next(message);
  }

  private async presentWarningToast(): Promise<void> {
    if (!this.sessionActive || !this.foregroundTrackingEnabled || this.warningToast) {
      return;
    }

    this.warningToast = await this.toastController.create({
      message: `Session will expire in ${this.formatWarningWindow()} due to inactivity.`,
      duration: this.currentWarningMs,
      color: 'warning',
      position: 'top',
    });

    await this.warningToast.present();
    await this.warningToast.onDidDismiss();

    if (this.warningToast) {
      this.warningToast = null;
    }
  }

  private async dismissWarningToast(): Promise<void> {
    const toast = this.warningToast;
    this.warningToast = null;
    if (toast) {
      await toast.dismiss();
    }
  }

  private readTimestamp(storageKey: string): number | null {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private writeTimestamp(storageKey: string, value: number): void {
    localStorage.setItem(storageKey, String(value));
  }

  private clearTimestamp(storageKey: string): void {
    localStorage.removeItem(storageKey);
  }

  // Convert login response minutes into the millisecond values used by timers.
  private normalizeTimeoutMs(timeoutMins: number | undefined): number {
    if (this.isValidTimeoutMins(timeoutMins)) {
      return Number(timeoutMins) * 60 * 1000;
    }

    return this.defaultTimeoutMins * 60 * 1000;
  }

  private isValidTimeoutMins(timeoutMins: number | undefined): boolean {
    const parsed = Number(timeoutMins);
    return Number.isFinite(parsed) && parsed > 0;
  }

  // Keep warning windows short enough for mobile UX but never completely absent.
  private buildWarningMs(timeoutMs: number): number {
    return Math.min(60 * 1000, Math.max(15 * 1000, Math.floor(timeoutMs / 5)));
  }

  private formatWarningWindow(): string {
    if (this.currentWarningMs >= 60 * 1000) {
      const minutes = Math.round(this.currentWarningMs / (60 * 1000));
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }

    const seconds = Math.max(1, Math.round(this.currentWarningMs / 1000));
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
  }
}
