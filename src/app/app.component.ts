import { Component, OnDestroy, OnInit } from '@angular/core';
import { Platform, ToastController } from '@ionic/angular';
import { App as CapacitorApp } from '@capacitor/app';
import { NetworkService } from './services/network.service';
import { distinctUntilChanged, skip, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private lastBackPressMs = 0;
  private networkSubscription: Subscription | null = null;

  constructor(
    private platform: Platform,
    private networkService: NetworkService,
    private toastController: ToastController
  ) {
    this.platform.ready().then(() => {
      this.registerDoubleBackExit();
    });
  }

  ngOnInit(): void {
    this.startNetworkListener();
  }

  ngOnDestroy(): void {
    this.networkSubscription?.unsubscribe();
  }

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

  private startNetworkListener(): void {
    if (this.networkSubscription) return;
    this.networkSubscription = this.networkService.isOnline$
      .pipe(distinctUntilChanged(), skip(1))
      .subscribe((online) => {
        void this.presentNetworkToast(online);
      });
  }

  private async presentNetworkToast(online: boolean): Promise<void> {
    const toast = await this.toastController.create({
      message: online ? 'Back online' : 'You are offline',
      duration: 2200,
      color: online ? 'success' : 'warning',
      position: 'top',
    });
    await toast.present();
  }
}
