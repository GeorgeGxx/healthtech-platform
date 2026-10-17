import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'appointments',
    loadComponent: () =>
      import('./features/appointments/appointments.component').then(
        (m) => m.AppointmentsComponent,
      ),
  },
  {
    path: 'patients',
    loadComponent: () =>
      import('./features/patients/patients.component').then(
        (m) => m.PatientsComponent,
      ),
  },
  {
    path: 'medical-records',
    loadComponent: () =>
      import('./features/medical-records/medical-records.component').then(
        (m) => m.MedicalRecordsComponent,
      ),
  },
  {
    path: 'hospitalizations',
    loadComponent: () =>
      import('./features/hospitalizations/hospitalizations.component').then(
        (m) => m.HospitalizationsComponent,
      ),
  },
  {
    path: 'billing',
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
    path: '**',
    redirectTo: 'dashboard',
  },
];
