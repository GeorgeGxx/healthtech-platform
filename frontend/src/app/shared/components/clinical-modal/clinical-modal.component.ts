import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ClinicalModalVariant = 'center' | 'drawer';
export type ClinicalBadgeColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue' | 'sky';

@Component({
  selector: 'app-clinical-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clinical-modal.component.html',
})
export class ClinicalModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() badgeText = '';
  @Input() badgeColor: ClinicalBadgeColor = 'indigo';
  @Input() variant: ClinicalModalVariant = 'center';
  @Input() maxWidth = 'max-w-xl';
  @Input() closeOnBackdrop = true;

  @Output() close = new EventEmitter<void>();

  @HostListener('window:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (this.isOpen) {
      event.preventDefault();
      this.handleClose();
    }
  }

  handleClose(): void {
    this.close.emit();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.handleClose();
    }
  }

  getDotColorClass(): string {
    switch (this.badgeColor) {
      case 'emerald': return 'bg-emerald-600 shadow-emerald-500/40';
      case 'rose': return 'bg-rose-600 shadow-rose-500/40';
      case 'amber': return 'bg-amber-600 shadow-amber-500/40';
      case 'blue': return 'bg-blue-600 shadow-blue-500/40';
      case 'sky': return 'bg-sky-600 shadow-sky-500/40';
      case 'indigo':
      default: return 'bg-indigo-600 shadow-indigo-500/40';
    }
  }

  getPillColorClass(): string {
    switch (this.badgeColor) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200/80';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200/80';
      case 'sky': return 'bg-sky-50 text-sky-700 border-sky-200/80';
      case 'indigo':
      default: return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    }
  }
}
