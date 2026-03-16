import { Injectable } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { InAppBrowser } from '@capacitor/inappbrowser';
import { DeviceService } from './device';
import { DeviceLoginResponse, GenexusService } from './genexus';
import { environment } from 'src/environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppInitService {
   private readonly apiUrl = environment.apiUrl;
  private readonly websiteUrl = this.normalizeBaseUrl(environment.websiteUrl);
  private readonly deploymentBaseUrl = this.websiteUrl.substring(0, this.websiteUrl.lastIndexOf('/'));
  private deviceId = 'unknown-device';
  private manufacturer = 'Unknown';
  private iabRef: any;


  constructor(
    private readonly platform: Platform,
    private readonly alertCtrl: AlertController,
    private readonly deviceService: DeviceService,
    private readonly genexusService: GenexusService
  ) {
    console.log('Deployment Base URL:', this.deploymentBaseUrl);

  }


  async initialize(options?: { openWebsite?: boolean }): Promise<void> {
    const shouldOpenWebsite = options?.openWebsite ?? true;
    await this.platform.ready();
    this.registerOfflineHandler();
    const targetUrl ='https://122.103.187.60/tkz_gx18u10_wwp1534JavaPostgreSQL/com.tkzgx18u10wwp1534.z101_wp01_login'; // await this.sendDeviceMetadata() || this.websiteUrl;
    // await this.sendDeviceMetadata();
    console.log('Target URL to open:', targetUrl);
    if (shouldOpenWebsite) {
      await this.openWebsite(targetUrl);
    }
  }

  async reloadWebsite(): Promise<void> {
    if (this.iabRef?.close) {
      try {
        this.iabRef.close();
      } catch (e) {
        console.warn('Failed to close existing in-app browser', e);
      }
    }
    // await this.openWebsite(this.websiteUrl);
    await this.initialize({ openWebsite: true });
  }

  private registerOfflineHandler(): void {
    if (!navigator.onLine) {
      void this.presentOfflineAlert();
    }

    window.addEventListener('offline', () => {
      void this.presentOfflineAlert();
    });
  }

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

      // DIAGNOSTIC ALERT: Keep this to show EXACTLY what is happening
      const diagAlert = await this.alertCtrl.create({
        header: 'Diagnostic Info',
        message: `ID: ${deviceId}\nManufacturer: ${manufacturer}`,
        buttons: ['OK']
      });
      await diagAlert.present();

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

          // Append device info to redirect URL as query params for the backend
          const connector = redirectUrl.includes('?') ? '&' : '?';
          redirectUrl += `${connector}P_deviceId=${encodeURIComponent(deviceId)}&P_manufacturer=${encodeURIComponent(manufacturer)}`;

          console.log('Resolved redirect URL with params:', redirectUrl);
          return redirectUrl;
        }
      }
      // await alert.present();
      // No hardcoded backend route: show local 404 page inside the app.
      return '/not-found';
      // return this.apiUrl; // For testing, open API URL directly to see response.
    } catch (error) {
      console.error('Error getting device info or sending data', error);
    }

    return '/not-found';
    // return this.apiUrl;
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
    console.log('Opening URL in external browser:', {
      url,
      isHybrid,
      platforms: this.platform.platforms(),
    });

    if (isHybrid) {
      try {
        await InAppBrowser.openInExternalBrowser({ url });
        console.log('InAppBrowser.openInExternalBrowser success');
        return;
      } catch (error) {
        console.warn('InAppBrowser external open failed, falling back to window.open', error);
      }
    }

    // In browser/dev-server runs, window.open can be blocked as popup.
    // Use same-tab navigation so URL always opens during web testing.
    window.location.assign(url);
  }

  private normalizeBaseUrl(url: string): string {
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }
    return url;
  }
}
