import { Injectable } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
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
  private deviceId = 'unknown-device';
  private manufacturer = 'Unknown';
  private iabRef: any;


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
    // this.registerOfflineHandler();
    const targetUrl = await this.sendDeviceMetadata();
    console.log('Target URL to open:', targetUrl);
    if (shouldOpenWebsite && targetUrl) {
      await this.openWebsite(targetUrl);
    }
  }

  async reloadWebsite(): Promise<void> {
    if (this.iabRef?.close) {
      try {
        this.iabRef.close();
      } catch (e) {
        console.warn('Failed to close existing in-app browser', e);
      } finally {
        this.iabRef = null;
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

      // const diagAlert = await this.alertCtrl.create({
      //   header: 'Diagnostic Info',
      //   message: `ID: ${deviceId}\nManufacturer: ${manufacturer}`,
      //   buttons: ['OK']
      // });
      // await diagAlert.present();

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

  // private async presentOfflineAlert(): Promise<void> {
  //   const alert = await this.alertCtrl.create({
  //     header: 'No Internet Connection',
  //     message: 'Please check your internet connection and try again.',
  //     buttons: ['OK'],
  //   });
  //   await alert.present();
  // }

  private async openWebsite(url: string): Promise<void> {
    console.log('Attempting to open URL:', url);
    // If it's an in-app route, use the SPA router (no external navigation).
    if (url.startsWith('/')) {
      console.log('Opening in-app route:', url);
      await this.router.navigateByUrl(url, { replaceUrl: true });
      return;
    }

    const trackedUrl = this.withDeviceParams(url);

    if (this.platform.is('hybrid')) {
      const w: any = window as any;
      const iab = w?.cordova?.InAppBrowser;
      if (iab?.open) {
        this.iabRef = iab.open(
          trackedUrl,
          '_blank',
          'location=no,toolbar=no,hideurlbar=yes,zoom=no,hardwareback=yes'
        );

        // If user swipes/back-closes the website view, exit app to avoid white startup page.
        if (this.iabRef?.addEventListener) {
          this.iabRef.addEventListener('exit', () => {
            void CapacitorApp.exitApp();
          });
        }
        return;
      }
    }

    console.log('Opening URL in app webview:', trackedUrl);
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

  private async navigateNotFound(): Promise<void> {
    // await this.zone.run(() => this.router.navigate(['/not-found']));
    this.router.navigate(['/not-found']);
  }
}
