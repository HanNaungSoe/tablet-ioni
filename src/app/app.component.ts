import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonRouterOutlet, Platform, ToastController } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { NetworkService } from './services/network.service';
import { Capacitor } from '@capacitor/core';
import { distinctUntilChanged, filter, skip, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(IonRouterOutlet, { static: true }) private routerOutlet?: IonRouterOutlet;

  private readonly exitGestureWindowMs = 2000;
  private readonly swipeStartMaxX = 40;
  private readonly swipeMinDistance = 110;
  private readonly swipeMaxVerticalDrift = 70;
  private lastExitAttemptMs = 0;
  private networkSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;
  private currentUrl = '/';
  private touchStartX = 0;
  private touchStartY = 0;

  constructor(
    private platform: Platform,
    private networkService: NetworkService,
    private toastController: ToastController,
    private router: Router
  ) {
    this.platform.ready().then(() => {
      this.registerDoubleBackExit();
    });
  }

  ngOnInit(): void {
    this.startNetworkListener();
    this.startRouteListener();
  }

  ngOnDestroy(): void {
    this.networkSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  private registerDoubleBackExit(): void {
    this.platform.backButton.subscribeWithPriority(10, () => {
      if (this.routerOutlet?.canGoBack()) {
        void this.routerOutlet.pop();
        return;
      }

      void this.requestExit('Press back again to exit');
    });
  }

  private startNetworkListener(): void {
    if (this.networkSubscription) return;
    this.networkSubscription = this.networkService.isOnline$
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((online) => {
        void this.presentNetworkToast(online);
      });
  }

  private startRouteListener(): void {
    if (this.routerSubscription) return;
    this.currentUrl = this.router.url;
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  @HostListener('document:touchstart', ['$event'])
  handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  @HostListener('document:touchend', ['$event'])
  handleTouchEnd(event: TouchEvent): void {
    if (!Capacitor.isNativePlatform() || this.routerOutlet?.canGoBack()) {
      return;
    }

    if (!this.isExitEligibleRoute()) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    const isEdgeSwipe = this.touchStartX <= this.swipeStartMaxX;
    const isHorizontalSwipe = deltaX >= this.swipeMinDistance && deltaY <= this.swipeMaxVerticalDrift;

    if (isEdgeSwipe && isHorizontalSwipe) {
      void this.requestExit('Swipe again to exit');
    }
  }

  private async requestExit(prompt: string): Promise<void> {
    const now = Date.now();
    if (now - this.lastExitAttemptMs < this.exitGestureWindowMs) {
      await CapacitorApp.exitApp();
      return;
    }

    this.lastExitAttemptMs = now;
    await this.presentExitToast(prompt);
  }

  private isExitEligibleRoute(): boolean {
    return this.currentUrl === '/' || this.currentUrl.startsWith('/home') || this.currentUrl.startsWith('/register');
  }

  private async presentNetworkToast(online: boolean): Promise<void> {
    const toast = await this.toastController.create({
      message: online ? 'Back online' : 'You are offline',
      duration: 2200,
      color: online ? 'success' : 'warning',
      position: 'top',
    });
    await toast.present();
  }

  private async presentExitToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: this.exitGestureWindowMs,
      color: 'medium',
      position: 'bottom',
    });
    await toast.present();
  }
}
