import { Component } from '@angular/core';
import { AppInitService } from '../services/app-init.service';

interface QuickLink {
  title: string;
  description: string;
  icon: string;
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
      title: '見積もり管理',
      description: '見積もり管理メニューを開きます。',
      icon: 'document-text-outline',
      // pagePath: 'com.tkzgx18u10wwp1534.t300_mitusmori_menu',
      pagePath: 'com.tkzgx18u10wwp1534new.t300_mitusmori_menu',
    },
    {
      title: '試験管理',
      description: '試験管理メニューを開きます。',
      icon: 'clipboard-outline',
      // pagePath: 'com.tkzgx18u10wwp1534.t200_shiken_menu',
      pagePath: 'com.tkzgx18u10wwp1534new.t200_shiken_menu',
    },
    {
      title: '売上・請求入金管理',
      description: '売上・請求入金管理メニューを開きます。',
      icon: 'cash-outline',
      // pagePath: 'com.tkzgx18u10wwp1534.t400_uriage_menu',
      pagePath: 'com.tkzgx18u10wwp1534new.t400_uriage_menu',
    },
    {
      title: 'マスタ管理',
      description: 'マスタ管理メニューを開きます。',
      icon: 'layers-outline',
      pagePath: 'com.tkzgx18u10wwp1534new.t100_master_menu',
      // pagePath: 'com.tkzgx18u10wwp1534.t100_master_menu',
    },
  ];

  constructor(private readonly appInitService: AppInitService) {}

  async openLink(pagePath: string): Promise<void> {
    await this.appInitService.openEnvironmentPage(pagePath);
  }
}
