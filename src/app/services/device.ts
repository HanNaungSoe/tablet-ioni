import { Injectable } from '@angular/core';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceService {

  async getDeviceId(): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      return 'web-device-id';
    }

    const id = await Device.getId();
    return id.identifier; // ANDROID_ID or UUID
  }

  async getDeviceInfo(): Promise<any> {
    if (!Capacitor.isNativePlatform()) {
      return {
        platform: Capacitor.getPlatform(),
        manufacturer: 'Unknown',
      };
    }

    const info = await Device.getInfo();
    console.log('Fetching device information...', info);
    return info;
  }
}
