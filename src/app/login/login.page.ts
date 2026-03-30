import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  credentials = {
    username: '',
    password: '',
  };

  statusMessage = '';

  login(): void {
    const username = this.credentials.username.trim();
    if (!username || !this.credentials.password) {
      this.statusMessage = 'Please enter both username and password.';
      return;
    }

    this.statusMessage = `Demo sign-in ready for ${username}. Connect this page to your real login API when needed.`;
  }
}
