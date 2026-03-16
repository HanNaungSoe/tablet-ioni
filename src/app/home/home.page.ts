import { Component, OnInit } from '@angular/core';
import { RefresherCustomEvent } from '@ionic/angular';
import { AppInitService } from '../services/app-init.service';
import { DeviceService } from '../services/device';
import { GenexusService } from '../services/genexus';

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

  constructor(private readonly appInitService: AppInitService,
    private readonly deviceService: DeviceService,
    private readonly genexusService: GenexusService
  ) { }

  async ngOnInit(): Promise<void> {
    this.deviceInfo = await this.deviceService.getDeviceInfo();
    this.deviceId = await this.deviceService.getDeviceId();
    this.lastCheckedAt = new Date();
    console.log('Device Info:', this.deviceInfo);
  }

  get isOnline(): boolean {
    return navigator.onLine;
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
