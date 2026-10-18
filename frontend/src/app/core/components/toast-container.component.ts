import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform animate-slide-up"
          [ngClass]="getToastClasses(toast.type)"
        >
          <!-- Icono contextual -->
          <div class="shrink-0 mt-0.5">
            @if (toast.type === 'success') {
              <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              </div>
            } @else if (toast.type === 'error') {
              <div class="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </div>
            } @else if (toast.type === 'warning') {
              <div class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01"/></svg>
              </div>
            } @else {
              <div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01"/></svg>
              </div>
            }
          </div>

          <!-- Mensaje -->
          <div class="flex-1 min-w-0 pr-1">
            @if (toast.title) {
              <h4 class="text-xs font-black uppercase tracking-wider text-slate-900 mb-0.5">{{ toast.title }}</h4>
            }
            <p class="text-xs font-medium text-slate-700 leading-relaxed">{{ toast.message }}</p>
          </div>

          <!-- Cerrar -->
          <button
            (click)="toastService.remove(toast.id)"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar notificación"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getToastClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10';
      case 'error':
        return 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-500/10';
      case 'warning':
        return 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-500/10';
      default:
        return 'bg-blue-50/95 border-blue-300 text-blue-950 shadow-blue-500/10';
    }
  }
}
