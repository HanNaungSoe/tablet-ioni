import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.page.html',
  styleUrls: ['./not-found.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class NotFoundPage {

  constructor(private router: Router) {}

  /**
   * Navigate to the home page.
   * @returns A Promise that resolves when the navigation is complete.
   */
  async reload(): Promise<void> {
    this.router.navigate(['/home'], { state: { skipDeviceCheck: true } });
  }
}
