import { Component } from '@angular/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { DeviceService } from './services/device';
import { GenexusService } from './services/genexus';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // private deviceId: any;
  // private deviceInfo: any;
  // constructor(private deviceService: DeviceService, private genexusService: GenexusService) { }
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
}
