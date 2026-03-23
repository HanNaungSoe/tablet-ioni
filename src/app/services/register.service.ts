import { Injectable } from '@angular/core';
import { DeviceService } from './device';

export interface RegistrationRecord {
  userId: string;
  deviceId: string;
  manufacturer: string;
  registeredAt: string;
}

export interface RegistrationDraft {
  userId: string;
  deviceId: string;
  manufacturer: string;
}

@Injectable({
  providedIn: 'root',
})
export class RegisterService {
  private readonly storageKey = 'tablet-registration';

  constructor(private readonly deviceService: DeviceService) {}

  async getDraft(): Promise<RegistrationDraft> {
    const saved = this.getRegistration();

    let deviceId = saved?.deviceId ?? 'Unknown';
    let manufacturer = saved?.manufacturer ?? 'Unknown';

    try {
      deviceId = await this.deviceService.getDeviceId();
    } catch (error) {
      console.warn('Failed to load device ID for registration', error);
    }

    try {
      const deviceInfo = await this.deviceService.getDeviceInfo();
      manufacturer = deviceInfo.manufacturer ?? manufacturer;
    } catch (error) {
      console.warn('Failed to load device manufacturer for registration', error);
    }

    return {
      userId: saved?.userId ?? '',
      deviceId,
      manufacturer,
    };
  }

  getRegistration(): RegistrationRecord | null {
    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as RegistrationRecord;
    } catch (error) {
      console.warn('Failed to parse saved registration', error);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  hasRegistration(): boolean {
    return !!this.getRegistration()?.userId?.trim();
  }

  async register(userId: string): Promise<RegistrationRecord> {
    const draft = await this.getDraft();
    const record: RegistrationRecord = {
      userId: userId.trim(),
      deviceId: draft.deviceId,
      manufacturer: draft.manufacturer,
      registeredAt: new Date().toISOString(),
    };

    // In a real app, you would also send this info to a backend server here.
    localStorage.setItem(this.storageKey, JSON.stringify(record));
    return record;
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }
}
