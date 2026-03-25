import { Injectable } from '@angular/core';
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
import { DeviceService } from './device';
import { DeviceLoginResponse, GenexusService } from './genexus';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

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


  constructor(
    private readonly platform: Platform,
    private readonly alertCtrl: AlertController,
    private readonly deviceService: DeviceService,
    private readonly genexusService: GenexusService,
    private readonly router: Router
  ) {
    console.log('Deployment Base URL:', this.deploymentBaseUrl);

  }


  async initialize(options?: { openWebsite?: boolean }): Promise<void> {
    const shouldOpenWebsite = options?.openWebsite ?? true;
    await this.platform.ready();
    this.registerOfflineHandler();
    const targetUrl = await this.sendDeviceMetadata();
    console.log('Target URL to open:', targetUrl);
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
    // await this.openWebsite(this.websiteUrl);
    await this.initialize({ openWebsite: true });
  }

  async openEnvironmentPage(pagePath: string): Promise<void> {
    await this.openWebsite(this.resolveEnvironmentUrl(pagePath));
  }

  private registerOfflineHandler(): void {
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

      if (res?.isAllowed) {
        console.log('Redirecting to:', res.redirectUrl);
        if (res.redirectUrl) {
          const normalizedRedirect = res.redirectUrl.replace(/^\/+/, '');
          let redirectUrl = `${this.deploymentBaseUrl}/${normalizedRedirect}`;
          console.log('Constructed redirect URL:', redirectUrl);

          // Append device info to redirect URL as query params for the backend
          const connector = redirectUrl.includes('?') ? '&' : '?';
          redirectUrl += `${connector}P_deviceId=${encodeURIComponent(this.deviceId)}&P_manufacturer=${encodeURIComponent(this.manufacturer)}`;

          console.log('Resolved redirect URL with params:', redirectUrl);
          return redirectUrl;
        }
      }
      await this.navigateNotFound();
      return null;
    } catch (error) {
      console.error('Error getting device info or sending data', error);
    }

    await this.navigateNotFound();
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

    // Original code kept for reference:
    // console.log('Opening URL in external browser:', url);
    // if (this.platform.is('hybrid')) {
    //   try {
    //     await InAppBrowser.openInExternalBrowser({ url });
    //     return;
    //   } catch (error) {
    //     console.warn('InAppBrowser external open failed, falling back to window.open', error);
    //   }
    // }
    // window.open(url, '_blank', 'noopener,noreferrer');

    const isHybrid = this.platform.is('hybrid');
    console.log('Opening URL in in-app webview:', {
      url: trackedUrl,
      isHybrid,
      platforms: this.platform.platforms(),
    });

    if (isHybrid) {
      try {
        if (await this.handleHttpsIpCertificateMismatch(trackedUrl)) {
          return;
        }

        if (!this.listenersReady) {
          this.listenersReady = true;
          await InAppBrowser.addListener('browserPageLoaded', () => {
            this.clearLoadTimeout();
          });
          await InAppBrowser.addListener('browserPageNavigationCompleted', (data: { url?: string }) => {
            console.log('WebView navigation completed:', data?.url);
            this.clearLoadTimeout();
          });
          await InAppBrowser.addListener('browserClosed', () => {
            this.clearLoadTimeout();
          });
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
        console.log('InAppBrowser.openInWebView success');
        return;
      } catch (error) {
        this.clearLoadTimeout();
        console.warn('InAppBrowser open failed, falling back to window.open', error);
      }
    }

    // In browser/dev-server runs, window.open can be blocked as popup.
    // Use same-tab navigation so URL always opens during web testing.
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

  private async navigateHome(): Promise<void> {
    sessionStorage.setItem('skipDeviceCheck', '1');
    this.router.navigate(['/home'], { state: { skipDeviceCheck: true }, replaceUrl: true });
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
    await this.router.navigate(['/not-found'], { replaceUrl: true });
  }
}
