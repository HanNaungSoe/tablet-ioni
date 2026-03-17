import { Component } from '@angular/core';
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
export class HomePage {
  deviceInfo: any;
  constructor(private readonly appInitService: AppInitService,
    private readonly deviceService: DeviceService,
    private readonly genexusService: GenexusService
  ) { }

  async ngOnInit(): Promise<void> {
    this.deviceInfo = await this.deviceService.getDeviceInfo();
    console.log('Device Info:', this.deviceInfo);
    await this.appInitService.initialize({ openWebsite: true });

  }

  async reload(): Promise<void> {
    await this.appInitService.reloadWebsite();
  }

  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    try {
      await this.reload();
    } finally {
      event.target.complete();
    }
  }
}
