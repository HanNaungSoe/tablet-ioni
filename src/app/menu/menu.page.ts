import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface QuickLink {
  title: string;
  description: string;
  icon: string;
  url: string;
}

@Component({
  selector: 'app-menu-page',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: false,
})
export class MenuPage {
  readonly quickLinks: QuickLink[] = [
    {
      title: 'Home',
      description: 'Return to the assigned tablet dashboard.',
      icon: 'home-outline',
      url: '/home',
    },
    {
      title: 'Register Device',
      description: 'Update the current user and device registration.',
      icon: 'id-card-outline',
      url: '/register',
    },
    {
      title: 'Contact Us',
      description: 'See support details for the tablet project.',
      icon: 'call-outline',
      url: '/contact',
    },
    {
      title: 'Login',
      description: 'Open the quick operator sign-in screen.',
      icon: 'log-in-outline',
      url: '/login',
    },
  ];

  constructor(private readonly router: Router) {}

  async openLink(url: string): Promise<void> {
    await this.router.navigateByUrl(url);
  }
}
