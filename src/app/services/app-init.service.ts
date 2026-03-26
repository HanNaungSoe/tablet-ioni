import { Injectable, NgZone } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import {
  InAppBrowser,
  AndroidAnimation,
  AndroidViewStyle,
  DismissStyle,
  iOSAnimation,
  iOSViewStyle,
  ToolbarPosition,
  type WebViewOptions,
} from '@capacitor/inappbrowser';
import { distinctUntilChanged, firstValueFrom, Subscription } from 'rxjs';
import { DeviceService } from './device';
import { DeviceAccessService } from './device-access.service';
import { DeviceLoginResponse, GenexusService } from './genexus';
import { NetworkService } from './network.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AppInitService {
  private readonly websiteUrl = this.normalizeBaseUrl(environment.websiteUrl);
  private readonly deploymentBaseUrl = this.websiteUrl.substring(0, this.websiteUrl.lastIndexOf('/'));
  private deviceId = 'unknown-device';
  private manufacturer = 'Unknown';
  private listenersReady = false;
  private loadTimeoutId: number | null = null;
  private openingWebView = false;
  private webViewActive = false;
  private lastAppRouteBeforeWebView: string | null = null;
  private webViewNetworkSubscription: Subscription | null = null;
  private suppressNextCloseNavigation = false;
  private handlingWebViewFailure = false;
  private presentingConnectionAlert = false;
  private offlineHandlerRegistered = false;

  constructor(
    private readonly platform: Platform,
    private readonly alertCtrl: AlertController,
    private readonly deviceService: DeviceService,
    private readonly deviceAccessService: DeviceAccessService,
    private readonly genexusService: GenexusService,
    private readonly networkService: NetworkService,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {
    console.log('Deployment Base URL:', this.deploymentBaseUrl);
  }

  async initialize(options?: { openWebsite?: boolean }): Promise<void> {
    const shouldOpenWebsite = options?.openWebsite ?? true;
    await this.platform.ready();
    this.registerOfflineHandler();
    this.deviceAccessService.beginCheck();

    const targetUrl = await this.sendDeviceMetadata();
    console.log('Target URL to open:', targetUrl);

    if (targetUrl) {
      this.deviceAccessService.allow();
    } else {
      this.deviceAccessService.block();
      await this.navigateNotFound();
    }

    if (shouldOpenWebsite && targetUrl) {
      await this.openWebsite(targetUrl);
    }
  }

  async reloadWebsite(): Promise<void> {
    if (this.platform.is('hybrid')) {
      try {
        await InAppBrowser.close();
      } catch (e) {
        console.warn('Failed to close existing in-app browser', e);
      }
    }
    await this.initialize({ openWebsite: true });
  }

  async openEnvironmentPage(pagePath: string): Promise<void> {
    await this.openWebsite(this.resolveEnvironmentUrl(pagePath));
  }

  private registerOfflineHandler(): void {
    if (this.offlineHandlerRegistered) {
      return;
    }

    this.offlineHandlerRegistered = true;

    if (!navigator.onLine) {
      void this.presentOfflineAlert();
    }

    window.addEventListener('offline', () => {
      void this.presentOfflineAlert();
    });
  }

  private async sendDeviceMetadata(): Promise<string | null> {
    try {
      try {
        this.deviceId = await this.deviceService.getDeviceId();
      } catch (e: any) {
        this.deviceId = 'unknown-device';
        console.warn('Device ID read failed, using fallback value', e);
      }

      try {
        const deviceInfo = await this.deviceService.getDeviceInfo();
        console.log('AppInitService: Device Info:', deviceInfo);
        this.manufacturer = deviceInfo.manufacturer ?? 'Unknown';
      } catch (e: any) {
        this.manufacturer = 'Unknown';
        console.warn('Device info read failed, using fallback manufacturer', e);
      }

      const res: DeviceLoginResponse = await firstValueFrom(
        this.genexusService.sendData(this.deviceId, this.manufacturer)
      );
      console.log('sendData SUCCESS:', res);

      if (res?.isAllowed && res.redirectUrl) {
        const normalizedRedirect = res.redirectUrl.replace(/^\/+/, '');
        let redirectUrl = `${this.deploymentBaseUrl}/${normalizedRedirect}`;
        const connector = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl += `${connector}P_deviceId=${encodeURIComponent(this.deviceId)}&P_manufacturer=${encodeURIComponent(this.manufacturer)}`;
        console.log('Resolved redirect URL with params:', redirectUrl);
        return redirectUrl;
      }
    } catch (error) {
      console.error('Error getting device info or sending data', error);
    }

    return null;
  }

  private async presentOfflineAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'No Internet Connection',
      message: 'Please check your internet connection and try again.',
      buttons: ['OK'],
    });
    await alert.present();
  }

  private async openWebsite(url: string): Promise<void> {
    if (url.startsWith('/')) {
      await this.router.navigateByUrl(url, { replaceUrl: true });
      return;
    }

    const trackedUrl = this.withDeviceParams(url);
    this.lastAppRouteBeforeWebView = this.router.url || '/startup';

    const isHybrid = this.platform.is('hybrid');
    console.log('Opening URL in in-app webview:', {
      url: trackedUrl,
      isHybrid,
      platforms: this.platform.platforms(),
    });

    if (!this.networkService.isOnline) {
      await this.handleWebViewFailure('Please check your internet connection and try again.', false);
      return;
    }

    if (isHybrid) {
      try {
        if (this.openingWebView) {
          console.warn('WebView open already in progress; skipping duplicate open.', trackedUrl);
          return;
        }

        if (await this.handleHttpsIpCertificateMismatch(trackedUrl)) {
          return;
        }

        this.openingWebView = true;

        if (!this.listenersReady) {
          this.listenersReady = true;
          await InAppBrowser.addListener('browserPageLoaded', () => {
            this.handlingWebViewFailure = false;
            this.clearLoadTimeout();
          });
          await InAppBrowser.addListener('browserPageNavigationCompleted', (data: { url?: string }) => {
            console.log('WebView navigation completed:', data?.url);
            this.clearLoadTimeout();
          });
          await InAppBrowser.addListener('browserClosed', () => {
            this.clearLoadTimeout();
            this.webViewActive = false;
            this.stopWebViewNetworkWatch();
            if (this.suppressNextCloseNavigation) {
              this.suppressNextCloseNavigation = false;
              return;
            }
            void this.navigateAfterWebViewClose();
          });
        }

        if (this.webViewActive) {
          this.suppressNextCloseNavigation = true;
        }

        try {
          await InAppBrowser.close();
        } catch {
          this.suppressNextCloseNavigation = false;
        }

        this.startLoadTimeout(trackedUrl);
        const webViewOptions: WebViewOptions = {
          showURL: true,
          showToolbar: true,
          clearCache: false,
          clearSessionCache: false,
          mediaPlaybackRequiresUserAction: false,
          closeButtonText: 'Close',
          toolbarPosition: ToolbarPosition.TOP,
          showNavigationButtons: true,
          leftToRight: true,
          android: {
            allowZoom: true,
            hardwareBack: true,
            pauseMedia: false,
          },
          iOS: {
            allowOverScroll: true,
            enableViewportScale: true,
            allowInLineMediaPlayback: true,
            surpressIncrementalRendering: false,
            viewStyle: iOSViewStyle.FULL_SCREEN,
            animationEffect: iOSAnimation.COVER_VERTICAL,
            allowsBackForwardNavigationGestures: true,
          },
        };

        await InAppBrowser.openInWebView({ url: trackedUrl, options: webViewOptions });
        this.webViewActive = true;
        this.handlingWebViewFailure = false;
        this.startWebViewNetworkWatch();
        console.log('InAppBrowser.openInWebView success');
        return;
      } catch (error) {
        this.clearLoadTimeout();
        console.warn('InAppBrowser open failed, falling back to window.open', error);
        await this.handleWebViewFailure('The assigned website could not be opened. Please try again.', false);
      } finally {
        this.openingWebView = false;
      }
    }

    window.location.assign(trackedUrl);
  }

  private withDeviceParams(url: string): string {
    if (!url.startsWith(this.deploymentBaseUrl)) {
      return url;
    }

    if (/[?&]P_deviceId=/.test(url) || /[?&]P_manufacturer=/.test(url)) {
      return url;
    }

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}P_deviceId=${encodeURIComponent(this.deviceId)}&P_manufacturer=${encodeURIComponent(this.manufacturer)}`;
  }

  private async handleHttpsIpCertificateMismatch(url: string): Promise<boolean> {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname);
      if (!isHttps || !isIPv4) {
        return false;
      }

      const alert = await this.alertCtrl.create({
        header: 'Certificate issue',
        message:
          'This URL uses HTTPS with an IP address. Android WebView will usually block it because the SSL certificate does not match the IP.\n\nUse a domain name with a valid certificate, or use HTTP for testing.',
        buttons: [
          {
            text: 'Open System Browser',
            handler: () => {
              void InAppBrowser.openInSystemBrowser({
                url,
                options: {
                  android: {
                    showTitle: true,
                    hideToolbarOnScroll: false,
                    viewStyle: AndroidViewStyle.FULL_SCREEN,
                    startAnimation: AndroidAnimation.FADE_IN,
                    exitAnimation: AndroidAnimation.FADE_OUT,
                  },
                  iOS: {
                    closeButtonText: DismissStyle.CLOSE,
                    viewStyle: iOSViewStyle.FULL_SCREEN,
                    animationEffect: iOSAnimation.COVER_VERTICAL,
                    enableBarsCollapsing: false,
                    enableReadersMode: false,
                  },
                },
              });
            },
          },
          { text: 'Cancel', role: 'cancel' },
        ],
      });
      await alert.present();
      return true;
    } catch {
      return false;
    }
  }

  private startLoadTimeout(url: string): void {
    this.clearLoadTimeout();
    this.loadTimeoutId = window.setTimeout(() => {
      void this.presentLoadStuckAlert(url);
    }, 15000);
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutId !== null) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
  }

  private async presentLoadStuckAlert(url: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Still loading',
      message:
        'The page did not finish loading.\n\nCommon causes:\n- Invalid HTTPS certificate (e.g. https://IP address)\n- Server blocked / timeout\n- No internet connection',
      buttons: [
        {
          text: 'Open System Browser',
          handler: () => {
            void InAppBrowser.openInSystemBrowser({
              url,
              options: {
                android: {
                  showTitle: true,
                  hideToolbarOnScroll: false,
                  viewStyle: AndroidViewStyle.FULL_SCREEN,
                  startAnimation: AndroidAnimation.FADE_IN,
                  exitAnimation: AndroidAnimation.FADE_OUT,
                },
                iOS: {
                  closeButtonText: DismissStyle.CLOSE,
                  viewStyle: iOSViewStyle.FULL_SCREEN,
                  animationEffect: iOSAnimation.COVER_VERTICAL,
                  enableBarsCollapsing: false,
                  enableReadersMode: false,
                },
              },
            });
            return false;
          },
        },
        { text: 'Retry' },
      ],
    });
    await alert.present();
  }

  private startWebViewNetworkWatch(): void {
    this.stopWebViewNetworkWatch();
    this.webViewNetworkSubscription = this.networkService.isOnline$
      .pipe(distinctUntilChanged())
      .subscribe((online) => {
        if (!online && this.webViewActive) {
          void this.handleWebViewFailure('Your internet connection was lost. Please reconnect and try again.');
        }
      });
  }

  private stopWebViewNetworkWatch(): void {
    this.webViewNetworkSubscription?.unsubscribe();
    this.webViewNetworkSubscription = null;
  }

  private async handleWebViewFailure(message: string, closeExistingWebView = true): Promise<void> {
    if (this.handlingWebViewFailure) {
      return;
    }

    this.handlingWebViewFailure = true;
    try {
      this.clearLoadTimeout();
      this.webViewActive = false;
      this.stopWebViewNetworkWatch();

      if (closeExistingWebView) {
        this.suppressNextCloseNavigation = true;
        try {
          await InAppBrowser.close();
        } catch (error) {
          console.warn('Failed to close in-app browser after connectivity issue', error);
          this.suppressNextCloseNavigation = false;
        }
      }

      await this.presentConnectionAlert(message);
      await this.navigateAfterWebViewClose();
    } finally {
      this.handlingWebViewFailure = false;
    }
  }

  private async presentConnectionAlert(message: string): Promise<void> {
    if (this.presentingConnectionAlert) {
      return;
    }

    this.presentingConnectionAlert = true;
    try {
      const alert = await this.alertCtrl.create({
        header: 'Connection unavailable',
        message,
        buttons: ['OK'],
      });
      await alert.present();
      await alert.onDidDismiss();
    } finally {
      this.presentingConnectionAlert = false;
    }
  }

  private async navigateAfterWebViewClose(): Promise<void> {
    this.deviceAccessService.allow();
    await this.zone.run(async () => {
      const targetRoute = this.lastAppRouteBeforeWebView ?? '/startup';
      if (targetRoute.startsWith('/startup')) {
        await this.router.navigate(['/menu'], { replaceUrl: true });
      }
    });
  }

  private resolveEnvironmentUrl(pagePath: string): string {
    if (/^https?:\/\//i.test(pagePath)) {
      return pagePath;
    }

    return `${this.deploymentBaseUrl}/${pagePath.replace(/^\/+/, '')}`;
  }

  private normalizeBaseUrl(url: string): string {
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }
    return url;
  }

  private async navigateNotFound(): Promise<void> {
    await this.zone.run(() => this.router.navigate(['/not-found'], { replaceUrl: true }));
  }
}
