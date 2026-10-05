import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'notifications',
    title: 'Notifications — PawRescue',
    loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
  },
  {
    path: 'signalements/:id',
    title: 'Détail du signalement — PawRescue',
    loadComponent: () => import('./features/reports/report-detail.component').then(m => m.ReportDetailComponent),
  },
  {
    path: 'profile',
    title: 'Mon profil — PawRescue',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'home',
    title: 'Animaux à adopter — PawRescue',
    loadComponent: () => import('./features/animals/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'animals/:id',
    title: 'Fiche animal — PawRescue',
    loadComponent: () => import('./features/animals/detail/animal-detail.component').then(m => m.AnimalDetailComponent),
  },
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
