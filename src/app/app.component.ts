import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private lastBackPressMs = 0;
  // private deviceId: any;
  // private deviceInfo: any;
  constructor(private platform: Platform) {
    this.platform.ready().then(() => {
      this.registerDoubleBackExit();
    });
  }
  // async ngOnInit() {
  //   await StatusBar.setOverlaysWebView({ overlay: false });
  //   await StatusBar.setBackgroundColor({ color: '#ffffff' });
  //   await StatusBar.setStyle({ style: StatusBarStyle.Dark });
  //   await StatusBar.hide();
  //   this.deviceId = await this.deviceService.getDeviceId();
  //   this.deviceInfo = await this.deviceService.getDeviceInfo();
  //   this.genexusService.sendData(this.deviceId, this.deviceInfo.manufacturer)
  //   console.log("App is api calling")
  // }

  private registerDoubleBackExit(): void {
    this.platform.backButton.subscribeWithPriority(10, () => {
      const now = Date.now();
      if (now - this.lastBackPressMs < 2000) {
        void CapacitorApp.exitApp();
        return;
      }
      this.lastBackPressMs = now;
    });
  }
}
