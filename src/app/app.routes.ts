import { Routes } from '@angular/router';
import { MockLoginPage, requireAuth, requireRole } from '../features/auth';
import { LayoutComponent } from './shell/layout.component';
import { ForbiddenPage } from './shell/forbidden.page';
import { NotFoundPage } from './shell/not-found.page';

export const routes: Routes = [
  { path: 'login', component: MockLoginPage, title: 'Sign in' },
  { path: 'forbidden', component: ForbiddenPage, title: 'Forbidden' },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [requireAuth],
    children: [
      {
        path: 'me',
        loadComponent: async () => (await import('../features/worktime/presentation/my-day.page')).MyDayPage,
        title: 'My day',
      },
      {
        path: 'absences/new',
        loadComponent: async () => (await import('../features/absences/presentation/absence-form.page')).AbsenceFormPage,
        title: 'New absence',
      },
      {
        path: 'balances',
        loadComponent: async () => (await import('../features/reports/presentation/balances.page')).BalancesPage,
        title: 'Balances',
      },
      {
        path: 'notifications',
        loadComponent: async () => (await import('../features/notifications/presentation/notifications-inbox.page')).NotificationsInboxPage,
        title: 'Notifications',
      },
      {
        path: 'approvals',
        canActivate: [requireRole('manager')],
        loadComponent: async () => (await import('../features/approvals/presentation/approvals-queue.page')).ApprovalsQueuePage,
        title: 'Approvals',
      },
      {
        path: 'hr',
        canActivate: [requireRole('hr')],
        loadComponent: async () => (await import('../features/documents/presentation/documents-queue.page')).DocumentsQueuePage,
        title: 'HR documents',
      },
      {
        path: 'admin',
        canActivate: [requireRole('admin')],
        loadComponent: async () => (await import('../features/admin/presentation/admin-home.page')).AdminHomePage,
        title: 'Admin',
      },
      { path: '', pathMatch: 'full', redirectTo: 'me' },
    ],
  },
  { path: '**', component: NotFoundPage, title: 'Not found' },
];
