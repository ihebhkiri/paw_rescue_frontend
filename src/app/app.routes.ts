import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth/register',
    title: 'Créer un compte — PawRescue AI',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth',
    title: 'Connexion — PawRescue AI',
    loadComponent: () => import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
];
