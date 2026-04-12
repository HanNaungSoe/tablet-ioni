import { Component } from '@angular/core';
import { AppInitService } from '../services/app-init.service';

interface QuickLink {
  title: string;
  description: string;
  iconSrc: string;
  accent: string;
  pagePath: string;
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
      title: '\u898b\u7a4d\u3082\u308a\u7ba1\u7406',
      description: '\u898b\u7a4d\u3082\u308a\u7ba1\u7406\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u304d\u307e\u3059\u3002',
      iconSrc: 'assets/menu-icons/estimate_cost.svg',
      accent: '#4caf50',
      pagePath: 'com.tkzgx18u10wwp1534.t300_mitusmori_menu',
    },
    {
      title: '\u8a66\u9a13\u7ba1\u7406',
      description: '\u8a66\u9a13\u7ba1\u7406\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u304d\u307e\u3059\u3002',
      iconSrc: 'assets/menu-icons/checklist.svg',
      accent: '#ff9800',
      pagePath: 'com.tkzgx18u10wwp1534.t200_shiken_menu',
    },
    {
      title: '\u58f2\u4e0a\u30fb\u8acb\u6c42\u5165\u91d1\u7ba1\u7406',
      description: '\u58f2\u4e0a\u30fb\u8acb\u6c42\u5165\u91d1\u7ba1\u7406\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u304d\u307e\u3059\u3002',
      iconSrc: 'assets/menu-icons/sales.svg',
      accent: '#42a5f5',
      pagePath: 'com.tkzgx18u10wwp1534.t400_uriage_menu',
    },
    {
      title: '\u30de\u30b9\u30bf\u7ba1\u7406',
      description: '\u30de\u30b9\u30bf\u7ba1\u7406\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u304d\u307e\u3059\u3002',
      iconSrc: 'assets/menu-icons/management.svg',
      accent: '#26a69a',
      pagePath: 'com.tkzgx18u10wwp1534.t100_master_menu',
    },
    
  ];

  constructor(private readonly appInitService: AppInitService) {}

  async openLink(pagePath: string): Promise<void> {
    await this.appInitService.openEnvironmentPage(pagePath);
  }
}
