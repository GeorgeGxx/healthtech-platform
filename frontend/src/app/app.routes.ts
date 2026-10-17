import { Routes } from '@angular/router';
import { authGuard, adminGuard, rootRedirectGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [rootRedirectGuard],
    children: [],
  },
  {
    path: 'servicios-y-costos',
    loadComponent: () =>
      import('./features/tariffs/tariffs.component').then(
        (m) => m.TariffsComponent,
      ),
  },
  {
    path: 'tariffs',
    redirectTo: 'servicios-y-costos',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'appointments',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/appointments/appointments.component').then(
        (m) => m.AppointmentsComponent,
      ),
  },
  {
    path: 'patients',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/patients/patients.component').then(
        (m) => m.PatientsComponent,
      ),
  },
  {
    path: 'medical-records',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/medical-records/medical-records.component').then(
        (m) => m.MedicalRecordsComponent,
      ),
  },
  {
    path: 'hospitalizations',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/hospitalizations/hospitalizations.component').then(
        (m) => m.HospitalizationsComponent,
      ),
  },
  {
    path: 'billing',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/billing/billing.component').then(
        (m) => m.BillingComponent,
      ),
  },
  {
    path: 'staff',
    loadComponent: () =>
      import('./features/staff/staff.component').then((m) => m.StaffComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: '**',
    redirectTo: 'servicios-y-costos',
  },
];
