import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff.component.html',
})
export class StaffComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly doctors = signal<any[]>([]);
  readonly hierarchy = signal<any[]>([]);

  ngOnInit(): void {
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
    this.api.getDoctorHierarchy().subscribe((h) => this.hierarchy.set(h));
  }
}
