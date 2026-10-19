import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'home', title: 'Accueil — PawRescue', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
  { path: 'refuges', title: 'Refuges — PawRescue', loadComponent: () => import('./features/shelters/shelters.component').then(m => m.SheltersComponent) },
  { path: 'signalements', title: 'Signalements et missions — PawRescue', loadComponent: () => import('./features/reports/report-list.component').then(m => m.ReportListComponent) },
  { path: 'signalements/nouveau', title: 'Signaler un animal — PawRescue', loadComponent: () => import('./features/reports/report-form.component').then(m => m.ReportFormComponent) },
  { path: 'messages', title: 'Messages — PawRescue', loadComponent: () => import('./features/messages/message-list.component').then(m => m.MessageListComponent) },
  { path: 'messages/:id', title: 'Conversation — PawRescue', loadComponent: () => import('./features/messages/chat.component').then(m => m.ChatComponent) },
  { path: 'animals/manage', title: 'Animaux — PawRescue', loadComponent: () => import('./features/animals/management/animal-management.component').then(m => m.AnimalManagementComponent) },
  { path: 'animals/new', redirectTo: 'animals/add', pathMatch: 'full' },
  { path: 'animals/add', title: 'Ajouter un animal — PawRescue', loadComponent: () => import('./features/animals/management/animal-form.component').then(m => m.AnimalFormComponent) },
  { path: 'animals/:id/edit', title: 'Modifier un animal — PawRescue', loadComponent: () => import('./features/animals/management/animal-form.component').then(m => m.AnimalFormComponent) },
  {
    path: 'adoptions',
    title: 'Demandes d’adoption — PawRescue',
    loadComponent: () => import('./features/adoptions/adoption-list.component').then(m => m.AdoptionListComponent),
  },
  {
    path: 'adoptions/:id',
    title: 'Demande d’adoption — PawRescue',
    loadComponent: () => import('./features/adoptions/adoption-detail.component').then(m => m.AdoptionDetailComponent),
  },
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
    path: 'animals',
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
