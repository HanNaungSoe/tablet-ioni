import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { LoginService } from '../services/login.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  readonly loginForm;
  isSubmitting = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly loginService: LoginService,
    private readonly router: Router,
    private readonly toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.nonNullable.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.loginService.isLoggedIn) {
      void this.router.navigate(['/menu'], { replaceUrl: true });
    }
  }

  get usernameControl() {
    return this.loginForm.controls.username;
  }

  get passwordControl() {
    return this.loginForm.controls.password;
  }

  async login(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      await this.presentToast('Please enter both username and password.', 'warning');
      return;
    }

    const username = this.usernameControl.value.trim();
    const password = this.passwordControl.value;
    this.isSubmitting = true;

    try {
      const response = await firstValueFrom(this.loginService.login({
        username,
        password,
      }));

      if (response?.status === 'success') {
        this.passwordControl.reset('');
        this.usernameControl.reset('');
        await this.router.navigate(['/menu'], { replaceUrl: true });
        return;
      }

      await this.presentToast(
        response?.message?.trim() || 'パスワードが間違っています。',
        'danger'
      );
    } catch (error) {
      console.error('Login failed', error);
      await this.presentToast('ただいまログインできません。しばらくしてから、再度お試しください。', 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async presentToast(message: string, color: 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2800,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
