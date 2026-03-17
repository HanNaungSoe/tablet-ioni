import { Component, OnInit } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { AppInitService } from '../services/app-init.service';
import { DeviceService } from '../services/device';
import { NetworkService } from '../services/network.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  deviceInfo: any;
  deviceId: any
  lastCheckedAt = new Date();
  isInitializing = true;

  constructor(private readonly appInitService: AppInitService,
    private readonly deviceService: DeviceService,
    private readonly networkService: NetworkService,
    private readonly router: Router
  ) { }

  async ngOnInit(): Promise<void> {
    this.deviceInfo = await this.deviceService.getDeviceInfo();
      this.deviceId = await this.deviceService.getDeviceId();
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
