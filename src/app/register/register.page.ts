import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NetworkService } from '../services/network.service';
import { RegisterService } from '../services/register.service';

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
    private readonly router: Router
  ) { }

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
      await this.registerService.register(this.form.userId);
      await this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      console.error('Failed to save registration', error);
      this.errorMessage = 'Unable to save registration right now. Please try again.';
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
}
