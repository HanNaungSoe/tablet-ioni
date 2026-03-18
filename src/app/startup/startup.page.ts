import { Component, OnInit } from '@angular/core';
import { AppInitService } from '../services/app-init.service';
import { DeviceService } from '../services/device';
import { RefresherCustomEvent } from '@ionic/angular';
import { NetworkService } from '../services/network.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-startup',
  standalone: false,
  templateUrl: './startup.page.html',
  styleUrls: ['./startup.page.scss'],
})
export class StartupPage implements OnInit {

  deviceInfo: any;
  deviceId: any
  lastCheckedAt = new Date();
  isInitializing = true;

  constructor(private readonly appInitService: AppInitService,
    private readonly deviceService: DeviceService,
    private readonly networkService: NetworkService,
    private readonly router: Router
  ) {
  }

  async ngOnInit(): Promise<void> {
    try {
      this.deviceInfo = await this.deviceService.getDeviceInfo();
      this.deviceId = await this.deviceService.getDeviceId();
    } catch (error) {
      console.warn('Failed to load device info', error);
    }
    // If skipDeviceCheck flag is set, skip device initialization and just show the home page.
    if (this.shouldSkipDeviceCheck()) {
      this.isInitializing = false;
      return;
    }

    this.isInitializing = true;
    try {

      await this.appInitService.initialize({ openWebsite: true });
      this.lastCheckedAt = new Date();
    } finally {
      this.isInitializing = false;
    }

  }

  private shouldSkipDeviceCheck(): boolean {
    const state = this.router.getCurrentNavigation()?.extras?.state as { skipDeviceCheck?: boolean } | undefined;
    return state?.skipDeviceCheck === true;
  }



  async reopenWebsite(): Promise<void> {
    await this.appInitService.reloadWebsite();
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

