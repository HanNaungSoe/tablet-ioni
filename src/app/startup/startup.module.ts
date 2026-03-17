import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { StartupPage } from './startup.page';
import { StartupPageRoutingModule } from './startup-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StartupPageRoutingModule,
  ],
  declarations: [StartupPage],
})
export class StartupPageModule {}
