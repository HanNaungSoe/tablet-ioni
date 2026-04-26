import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IonRouterOutlet, MenuController, Platform, ToastController } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { NetworkService } from './services/network.service';
import { Capacitor } from '@capacitor/core';
import { distinctUntilChanged, filter, skip, Subscription } from 'rxjs';
import { DeviceAccessService } from './services/device-access.service';
import { LoginService } from './services/login.service';
import { RegisterService } from './services/register.service';
import { SessionTimeoutService } from './services/session-timeout.service';
import { AppInitService } from './services/app-init.service';

interface AppMenuItem {
  title: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(IonRouterOutlet, { static: true }) private routerOutlet?: IonRouterOutlet;

  readonly appMenuItems: AppMenuItem[] = [
    { title: 'メニュー', url: '/menu', icon: 'id-card-outline' },
    { title: 'Contact Us', url: '/contact', icon: 'call-outline' },
  ];

  private readonly exitGestureWindowMs = 2000;
  private readonly swipeStartMaxX = 40;
  private readonly swipeMinDistance = 110;
  private readonly swipeMaxVerticalDrift = 70;
  private lastExitAttemptMs = 0;
  private networkSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;
  private sessionExpirationSubscription: Subscription | null = null;
  private currentUrl = '/';
  private touchStartX = 0;
  private touchStartY = 0;
  menuUserId = 'Not registered';
  menuDeviceId = 'Waiting for setup';

  constructor(
    private platform: Platform,
    private networkService: NetworkService,
    private toastController: ToastController,
    private router: Router,
    private menuController: MenuController,
    private deviceAccessService: DeviceAccessService,
    private loginService: LoginService,
    private registerService: RegisterService,
    private sessionTimeoutService: SessionTimeoutService,
    private appInitService: AppInitService
  ) {
    this.platform.ready().then(() => {
      this.registerDoubleBackExit();
    });
  }

  ngOnInit(): void {
    this.startNetworkListener();
    this.startRouteListener();
    this.startSessionExpirationListener();
    this.updateMenuMeta();

    if (this.loginService.isLoggedIn) {
      this.sessionTimeoutService.bindToActiveSession(this.loginService.session?.timeoutMins);
    }
  }

  ngOnDestroy(): void {
    this.networkSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
    this.sessionExpirationSubscription?.unsubscribe();
  }

  private registerDoubleBackExit(): void {
    this.platform.backButton.subscribeWithPriority(10, () => {
      void this.handleBackAction();
    });
  }

  get isOnline(): boolean {
    return this.networkService.isOnline;
  }

  isActiveRoute(url: string): boolean {
    return this.currentUrl === url || this.currentUrl.startsWith(`${url}/`);
  }

  get shouldShowMenu(): boolean {
    return this.deviceAccessService.isAllowed && this.loginService.isLoggedIn && this.isMenuRoute(this.currentUrl);
  }

  async navigateFromMenu(url: string): Promise<void> {
    await this.menuController.close();
    await this.router.navigateByUrl(url);
  }

  async logoutFromMenu(): Promise<void> {
    await this.menuController.close();
    this.loginService.logout();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }

  private async handleBackAction(): Promise<void> {
    if (await this.menuController.isOpen()) {
      await this.menuController.close();
      return;
    }

    if (this.isRootExitRoute()) {
      await this.requestExit('Press back again to exit');
      return;
    }

    if (this.routerOutlet?.canGoBack()) {
      await this.routerOutlet.pop();
      return;
    }

    await this.requestExit('Press back again to exit');
  }

  private updateMenuMeta(): void {
    const registration = this.registerService.getRegistration();
    this.menuUserId = registration?.userId?.trim() || 'Not registered';
    this.menuDeviceId = registration?.deviceId?.trim() || 'Waiting for setup';
  }

  private async exitAppNow(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await CapacitorApp.exitApp();
      return;
    }

    window.close();
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
        this.updateMenuMeta();
      });
  }

  private startSessionExpirationListener(): void {
    if (this.sessionExpirationSubscription) {
      return;
    }

    this.sessionExpirationSubscription = this.sessionTimeoutService.expired$
      .subscribe((message) => {
        void this.handleSessionExpired(message);
      });
  }

  @HostListener('document:touchstart', ['$event'])
  handleTouchStart(event: TouchEvent): void {
    this.sessionTimeoutService.recordActivity();

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  @HostListener('document:touchend', ['$event'])
  handleTouchEnd(event: TouchEvent): void {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    if (!this.canRequestExitFromSwipe()) {
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
      await this.exitAppNow();
      return;
    }

    this.lastExitAttemptMs = now;
    await this.presentExitToast(prompt);
  }

  private isExitEligibleRoute(): boolean {
    return this.currentUrl === '/'
      || this.currentUrl.startsWith('/startup')
      || this.currentUrl.startsWith('/register')
      || this.currentUrl.startsWith('/menu')
      || this.currentUrl.startsWith('/contact')
      || this.currentUrl.startsWith('/login')
      || this.currentUrl.startsWith('/not-found');
  }

  private isRootExitRoute(): boolean {
    return this.currentUrl === '/'
      || this.currentUrl.startsWith('/startup')
      || this.currentUrl.startsWith('/register')
      || this.currentUrl.startsWith('/login')
      || this.currentUrl.startsWith('/not-found');
  }

  private canRequestExitFromSwipe(): boolean {
    return this.isRootExitRoute() || (!this.routerOutlet?.canGoBack() && this.isExitEligibleRoute());
  }

  private isMenuRoute(url: string): boolean {
    return url.startsWith('/menu')
      || url.startsWith('/contact')
      || url.startsWith('/home');
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

  private async handleSessionExpired(message: string): Promise<void> {
    await this.menuController.close();
    await this.appInitService.closeActiveWebViewForLogout();
    this.loginService.logout();

    if (this.router.url !== '/login') {
      await this.router.navigate(['/login'], { replaceUrl: true });
    }

    const toast = await this.toastController.create({
      message,
      duration: 2800,
      color: 'warning',
      position: 'top',
    });
    await toast.present();
  }
}
