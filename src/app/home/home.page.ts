import { Component, OnInit } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { AppInitService } from '../services/app-init.service';
import { DeviceService } from '../services/device';
import { NetworkService } from '../services/network.service';
import { RegisterService } from '../services/register.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  deviceInfo: any;
  deviceId: any
  userId = '';
  lastCheckedAt = new Date();
  isInitializing = true;

  constructor(
    private readonly appInitService: AppInitService,
    private readonly deviceService: DeviceService,
    private readonly networkService: NetworkService,
    private readonly registerService: RegisterService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isInitializing = true;
    try {
      await this.loadDeviceInfo();
    } finally {
      this.isInitializing = false;
    }
    this.lastCheckedAt = new Date();
  }

  private async loadDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = await this.deviceService.getDeviceInfo();
      this.deviceId = await this.deviceService.getDeviceId();
      this.userId = this.registerService.getRegistration()?.userId ?? '';
    } catch (error) {
      console.warn('Failed to load device info', error);
    }
  }

  get isOnline(): boolean {
    return this.networkService.isOnline;
  }

  async reload(): Promise<void> {
    await this.appInitService.reloadWebsite();
    this.lastCheckedAt = new Date();
  }

  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    try {
      await this.reload();
    } finally {
      event.target.complete();
    }
  }
}
