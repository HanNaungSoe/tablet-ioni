import { Component, OnInit } from '@angular/core';
import { AppInitService } from '../services/app-init.service';
import { DeviceService } from '../services/device';
import { RefresherCustomEvent } from '@ionic/angular';
import { NetworkService } from '../services/network.service';
import { Router } from '@angular/router';
import { RegisterService } from '../services/register.service';

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
    private readonly router: Router,
    private readonly registerService: RegisterService
  ) {
  }

  async ngOnInit(): Promise<void> {
    try {
      this.deviceInfo = await this.deviceService.getDeviceInfo();
      this.deviceId = await this.deviceService.getDeviceId();
    } catch (error) {
      console.warn('Failed to load device info', error);
    }

    // if (!this.registerService.hasRegistration()) {
    //   await this.router.navigate(['/register'], { replaceUrl: true });
    //   return;
    // }

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



  async reopenWebsite(): Promise<void> {
    await this.appInitService.reloadWebsite();
  }

  get isOnline(): boolean {
    return this.networkService.isOnline;
  }

  async reload(): Promise<void> {

    await this.appInitService.reloadWebsite();
    this.lastCheckedAt = new Date()
  };

  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    try {
      await this.reload();
    } finally {
      event.target.complete();
    }
  }

}
