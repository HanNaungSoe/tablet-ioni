import { Component, OnInit } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { AppInitService } from '../services/app-init.service';
import { DeviceService } from '../services/device';
import { NetworkService } from '../services/network.service';
import { Router } from '@angular/router';
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
    private readonly router: Router,
    private readonly registerService: RegisterService
  ) {}

  async ngOnInit(): Promise<void> {
    // If skipDeviceCheck flag is set, skip device initialization and just show the home page.
    if (this.shouldSkipDeviceCheck()) {
      this.isInitializing = false;
      void this.loadDeviceInfo();
      return;
    }

    this.isInitializing = true;
    try {
      await this.loadDeviceInfo();
      await this.appInitService.initialize({ openWebsite: true });
      this.lastCheckedAt = new Date();
    } finally {
      this.isInitializing = false;
    }
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

  private shouldSkipDeviceCheck(): boolean {
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras?.state ?? history.state) as { skipDeviceCheck?: boolean } | undefined;
    const storageSkip = sessionStorage.getItem('skipDeviceCheck') === '1';
    const shouldSkip = state?.skipDeviceCheck === true || storageSkip;
    if (shouldSkip) {
      const { skipDeviceCheck, ...rest } = (state ?? {}) as Record<string, any>;
      history.replaceState(rest, document.title);
      sessionStorage.removeItem('skipDeviceCheck');
    }
    return shouldSkip;
  }

  /**
   * Returns true if the device is online, false otherwise.
   * @returns {boolean}
   */
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
