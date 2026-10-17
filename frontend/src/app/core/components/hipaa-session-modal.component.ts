import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HipaaSessionService } from '../services/hipaa-session.service';

@Component({
  selector: 'app-hipaa-session-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hipaa-session-modal.component.html',
})
export class HipaaSessionModalComponent {
  readonly sessionService = inject(HipaaSessionService);
}
