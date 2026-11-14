import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HipaaSessionService } from '../services/hipaa-session.service';

@Component({
  selector: 'app-hipaa-session-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hipaa-session-modal.component.html',
})
export class HipaaSessionModalComponent {
  readonly sessionService = inject(HipaaSessionService);
  password = '';
  readonly isSubmitting = signal(false);

  async submitRelogin(event: Event): Promise<void> {
    event.preventDefault();
    this.isSubmitting.set(true);
    const ok = await this.sessionService.relogin(this.password);
    this.isSubmitting.set(false);
    if (ok) {
      this.password = '';
    }
  }
}
