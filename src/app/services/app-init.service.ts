import { Injectable } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { NgZone } from '@angular/core';
import {
  InAppBrowser,
  ToolBarType,
} from '@capgo/inappbrowser';
import { DeviceService } from './device';
import { DeviceLoginResponse, GenexusService } from './genexus';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

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
  private lastOpenedUrl: string | null = null;


  constructor(
    private readonly platform: Platform,
    private readonly alertCtrl: AlertController,
    private readonly deviceService: DeviceService,
    private readonly genexusService: GenexusService,
    private readonly router: Router,
    private readonly zone: NgZone
  ) {
    console.log('Deployment Base URL:', this.deploymentBaseUrl);
  }


  async initialize(options?: { openWebsite?: boolean }): Promise<void> {
    const shouldOpenWebsite = options?.openWebsite ?? true;
    await this.platform.ready();
    // this.registerOfflineHandler();
    const targetUrl = await this.sendDeviceMetadata();
    console.log('Target URL to open:', targetUrl);
    if (shouldOpenWebsite) {
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

  // private registerOfflineHandler(): void {
  //   if (!navigator.onLine) {
  //     void this.presentOfflineAlert();
  //   }

  //   window.addEventListener('offline', () => {
  //     void this.presentOfflineAlert();
  //   });
  // }

  private async sendDeviceMetadata(): Promise<string> {
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
      return '/not-found';
    } catch (error) {
      console.error('Error getting device info or sending data', error);
    }

    return '/not-found';
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

    if (isHybrid) {
      try {
        if (this.openingWebView) {
          console.warn('WebView open already in progress; skipping duplicate open.', url);
          return;
        }
        this.openingWebView = true;
        this.lastOpenedUrl = url;

        if (!this.listenersReady) {
          this.listenersReady = true;
          await InAppBrowser.addListener('pageLoadError', () => {
            const failedUrl = this.lastOpenedUrl ?? url;
            // void this.presentLoadErrorAlert(failedUrl);
            void this.navigateHome();
          });
          await InAppBrowser.addListener('closeEvent', () => {
            void this.navigateHome();
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
          toolbarType: ToolBarType.COMPACT,
          visibleTitle: false,
          showReloadButton: true,
          isInspectable: environment.production !== true,
          activeNativeNavigationForWebview: true,

        });
        console.log('InAppBrowser.openWebView success');
        return;
      } catch (error) {
        console.warn('InAppBrowser open failed, falling back to window.open', error);
        // void this.presentLoadErrorAlert(url);
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

  private async navigateHome(): Promise<void> {
    await this.zone.run(() => this.router.navigate(['/home']));
  }
}
