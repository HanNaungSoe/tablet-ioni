import { Injectable } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import {
  InAppBrowser,
  ToolBarType,
} from '@capgo/inappbrowser';
import { DeviceService } from './device';
import { DeviceAccessService } from './device-access.service';
import { DeviceLoginResponse, GenexusService } from './genexus';
import { NetworkService } from './network.service';
import { environment } from 'src/environments/environment';
import { distinctUntilChanged, firstValueFrom, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppInitService {
  private readonly websiteUrl = /^https?:\/\//i.test(environment.websiteUrl)
    ? environment.websiteUrl
    : 'http://' + environment.websiteUrl;
  private readonly deploymentBaseUrl = this.websiteUrl.substring(0, this.websiteUrl.lastIndexOf('/'));
  private listenersReady = false;
  private openingWebView = false;
  private webViewActive = false;
  private lastAppRouteBeforeWebView: string | null = null;
  private lastOpenedUrl: string | null = null;
  private webViewNetworkSubscription: Subscription | null = null;
  private suppressNextCloseNavigation = false;
  private handlingWebViewFailure = false;
  private presentingConnectionAlert = false;


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
    this.deviceAccessService.beginCheck();
    // this.registerOfflineHandler();
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

  // For testing purposes, allows opening specific environment pages directly.
  async openEnvironmentPage(pagePath: string): Promise<void> {
    await this.openWebsite(this.resolveEnvironmentUrl(pagePath));
  }

  // private registerOfflineHandler(): void {
  //   if (!navigator.onLine) {
  //     void this.presentOfflineAlert();
  //   }

  //   window.addEventListener('offline', () => {
  //     void this.presentOfflineAlert();
  //   });
  // }

  private async sendDeviceMetadata(): Promise<string | null> {
    try {
      let deviceId = 'Error: could not get ID';
      try {
        deviceId = await this.deviceService.getDeviceId();
      } catch (e: any) {
        deviceId = `ID Error: ${e.message || JSON.stringify(e)}`;
      }

      let manufacturer = 'Unknown';
      try {
        const deviceInfo = await this.deviceService.getDeviceInfo();
        console.log('AppInitService: Device Info:', deviceInfo);
        manufacturer = deviceInfo.manufacturer ?? 'Unknown';
      } catch (e: any) {
        manufacturer = `Info Error: ${e.message || JSON.stringify(e)}`;
      }

      // const diagAlert = await this.alertCtrl.create({
      //   header: 'Diagnostic Info',
      //   message: `ID: ${deviceId}\nManufacturer: ${manufacturer}`,
      //   buttons: ['OK']
      // });
      // await diagAlert.present();

      const res: DeviceLoginResponse = await firstValueFrom(
        this.genexusService.sendData(deviceId, manufacturer)
      );
      console.log('sendData SUCCESS:', res);

      if (res?.isAllowed) {
        console.log('Redirecting to:', res.redirectUrl);
        if (res.redirectUrl) {
          const normalizedRedirect = res.redirectUrl.replace(/^\/+/, '');
          let redirectUrl = `${this.deploymentBaseUrl}/${normalizedRedirect}`;
          console.log('Constructed redirect URL:', redirectUrl);

          const connector = redirectUrl.includes('?') ? '&' : '?';
          redirectUrl += `${connector}P_deviceId=${encodeURIComponent(deviceId)}&P_manufacturer=${encodeURIComponent(manufacturer)}`;

          console.log('Resolved redirect URL with params:', redirectUrl);
          return redirectUrl;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting device info or sending data', error);
    }

    return null;
  }

  // private async presentOfflineAlert(): Promise<void> {
  //   const alert = await this.alertCtrl.create({
  //     header: 'No Internet Connection',
  //     message: 'Please check your internet connection and try again.',
  //     buttons: ['OK'],
  //   });
  //   await alert.present();
  // }

  private async openWebsite(url: string): Promise<void> {
    const isHybrid = this.platform.is('hybrid');
    console.log('Opening URL in in-app webview:', {
      url,
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
          console.warn('WebView open already in progress; skipping duplicate open.', url);
          return;
        }
        this.openingWebView = true;
        this.lastAppRouteBeforeWebView = this.router.url || '/startup';
        this.lastOpenedUrl = url;

        if (!this.listenersReady) {
          this.listenersReady = true;
          await InAppBrowser.addListener('pageLoadError', () => {
            void this.handleWebViewFailure('The assigned website is not reachable right now. Please try again.');
          });
          await InAppBrowser.addListener('browserPageLoaded', () => {
            this.handlingWebViewFailure = false;
          });
          await InAppBrowser.addListener('closeEvent', () => {
            this.webViewActive = false;
            this.stopWebViewNetworkWatch();
            if (this.suppressNextCloseNavigation) {
              this.suppressNextCloseNavigation = false;
              return;
            }
            void this.navigateBack();
          });
        }

        const cookieHeader = this.genexusService.getLastNativeCookieHeader();
        if (cookieHeader) {
          console.log('Passing native cookie header into WebView:', cookieHeader);
        }

        try {
          await InAppBrowser.close();
        } catch {}

        await InAppBrowser.openWebView({
          url,
          headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
          ignoreUntrustedSSLError: environment.insecureSsl === true,
          isPresentAfterPageLoad: true,
          toolbarType: ToolBarType.COMPACT,
          visibleTitle: false,
          showReloadButton: true,
          isInspectable: environment.production !== true,

        });
        this.webViewActive = true;
        this.handlingWebViewFailure = false;
        this.startWebViewNetworkWatch();
        console.log('InAppBrowser.openWebView success');
        return;
      } catch (error) {
        console.warn('InAppBrowser open failed, falling back to window.open', error);
        await this.handleWebViewFailure('The assigned website could not be opened. Please try again.', false);
      } finally {
        this.openingWebView = false;
      }
    }

    // In browser/dev-server runs, window.open can be blocked as popup.
    // Use same-tab navigation so URL always opens during web testing.
    window.location.assign(url);
  }

  // private async presentLoadErrorAlert(url: string): Promise<void> {
  //   const alert = await this.alertCtrl.create({
  //     header: 'Webpage not available',
  //     message: 'The page failed to load. This is often caused by an invalid HTTPS certificate (e.g. https://IP address).',
  //     buttons: [
  //       {
  //         text: 'Open System Browser',
  //         handler: () => {
  //           void InAppBrowser.open({ url });
  //         },
  //       },
  //       { text: 'Close', role: 'cancel' },
  //     ],
  //   });
  //   await alert.present();
  // }

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
      await this.navigateBack();
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

  private async navigateBack(): Promise<void> {
    this.deviceAccessService.allow();
    await this.zone.run(async () => {
      const targetRoute = this.lastAppRouteBeforeWebView ?? '/startup';

      if (targetRoute.startsWith('/startup')) {
        await this.router.navigate(['/menu'], { replaceUrl: true });
        return;
      }

      if (this.router.url === targetRoute) {
        return;
      }

      await this.router.navigateByUrl(targetRoute, { replaceUrl: true });
    });
  }

  private resolveEnvironmentUrl(pagePath: string): string {
    if (/^https?:\/\//i.test(pagePath)) {
      return pagePath;
    }

    return `${this.deploymentBaseUrl}/${pagePath.replace(/^\/+/, '')}`;
  }

  private async navigateNotFound(): Promise<void> {
    await this.zone.run(() => this.router.navigate(['/not-found'], { replaceUrl: true }));
  }
}
