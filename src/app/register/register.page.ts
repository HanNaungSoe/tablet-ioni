import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ToastController } from '@ionic/angular';
import { NetworkService } from '../services/network.service';
import { RegisterService } from '../services/register.service';

const REGISTER_SUCCESS_MESSAGE = 'リクエストが正常に完了しました。';
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  form = {
    userId: '',
    deviceId: '',
    manufacturer: '',
  };
  isLoading = true;
  isSaving = false;
  errorMessage = '';
  hasSavedRegistration = false;

  constructor(
    private readonly registerService: RegisterService,
    private readonly networkService: NetworkService,
    private readonly router: Router,
    private readonly toastController: ToastController
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDraft();
  }

  get isOnline(): boolean {
    return this.networkService.isOnline;
  }

  get canSubmit(): boolean {
    return !!this.form.userId.trim() && !!this.form.deviceId && !this.isSaving;
  }

  async refreshDeviceDetails(): Promise<void> {
    await this.loadDraft();
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) {
      return;
    }

    this.errorMessage = '';
    this.isSaving = true;

    try {
      const result = await this.registerService.register(this.form.userId);
      await this.showSuccessToast(
        result.response.message?.trim() || REGISTER_SUCCESS_MESSAGE
      );
      // await this.router.navigate(['/menu'], { replaceUrl: true });
    } catch (error) {
      console.error('Failed to save registration', error);
      this.errorMessage = error instanceof Error && error.message.trim()
        ? error.message
        : 'Unable to save registration right now. Please try again.';
      await this.showErrorToast(this.errorMessage);
    } finally {
      this.isSaving = false;
    }
  }

  private async loadDraft(): Promise<void> {
    this.isLoading = true;

    try {
      const saved = this.registerService.getRegistration();
      const draft = await this.registerService.getDraft();
      this.form = { ...draft };
      this.hasSavedRegistration = !!saved;
    } catch (error) {
      console.error('Failed to prepare registration form', error);
      this.errorMessage = 'Unable to read device information. Please refresh and try again.';
    } finally {
      this.isLoading = false;
    }
  }

  cancel(): void {
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.exitApp();
      return;
    }

    window.close();
  }

  private async showSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'top',
      color: 'success',
    });

    await toast.present();
    await toast.onDidDismiss();
  }

  private async showErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2400,
      position: 'top',
      color: 'danger',
    });

    await toast.present();
    await toast.onDidDismiss();
  }
}
