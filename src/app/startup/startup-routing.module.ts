import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StartupPage } from './startup.page';

const routes: Routes = [
  {
    path: '',
    component: StartupPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StartupPageRoutingModule {}
