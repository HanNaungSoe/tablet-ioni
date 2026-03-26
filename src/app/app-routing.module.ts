import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { deviceAccessGuard } from './guards/device-access.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'startup',
    pathMatch: 'full',
  },
  {
    path: 'startup',
    loadChildren: () => import('./startup/startup.module').then(m => m.StartupPageModule),
  },
  {
    path: 'home',
    canMatch: [deviceAccessGuard],
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
  },
  {
    path: 'menu',
    canMatch: [deviceAccessGuard],
    loadChildren: () => import('./menu/menu.module').then(m => m.MenuPageModule),
  },
  {
    path: 'contact',
    canMatch: [deviceAccessGuard],
    loadChildren: () => import('./contact/contact.module').then(m => m.ContactPageModule),
  },
  {
    path: 'login',
    canMatch: [deviceAccessGuard],
    loadChildren: () => import('./login/login.module').then(m => m.LoginPageModule),
  },
  {
    path: 'not-found',
    loadComponent: () => import('./not-found/not-found.page').then(m => m.NotFoundPage),
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterPageModule),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
