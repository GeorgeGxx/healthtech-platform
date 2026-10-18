import { Component, OnInit, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService, Medicamento, PharmacySummary } from '../../core/services/api.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { ToastService } from '../../core/services/toast.service';
import { ClinicalModalComponent } from '../../shared/components/clinical-modal/clinical-modal.component';

@Component({
  selector: 'app-medical-records',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ClinicalModalComponent],
  templateUrl: './medical-records.component.html',
})
export class MedicalRecordsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStateService);

  readonly records = signal<any[]>([]);
  readonly patients = signal<any[]>([]);
  readonly doctors = signal<any[]>([]);
  readonly pharmacySummary = signal<PharmacySummary | null>(null);
  readonly pharmacyStock = signal<Medicamento[]>([]);
  readonly isFtsMode = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly filterOnlyMyPatients = signal<boolean>(true);
  readonly showStockPanel = signal<boolean>(false);

  editingRecordId: number | null = null;
  selectedPatientId: number = 1;
  ftsQuery: string = '';

  drugName = '';
  drugDose = '';
  drugFreq = '';
  drugDays = 30;

  // Pacientes asignados al médico actual (Dra. Laura Gómez o tratante)
  readonly assignedPatientIds = computed<number[]>(() => [1, 2, 4]);

  readonly filteredPatients = computed<any[]>(() => {
    const list = this.patients();
    if (this.auth.isDoctor() && this.filterOnlyMyPatients()) {
      return list.filter((p) => this.assignedPatientIds().includes(p.idPaciente));
    }
    return list;
  });

  newRecord: any = {
    idPaciente: 1,
    idMedico: 2,
    diagnosticoCodigoCie: 'I10',
    diagnosticoDescripcion: '',
    tratamiento: '',
    signosVitales: {
      presion_arterial: '120/80',
      frecuencia_cardiaca_lpm: 75,
      temperatura_c: 36.6,
      peso_kg: 78.5,
      oxigeno_pct: 99,
    },
    recetaMedicamentos: [],
  };

  constructor() {
    effect(() => {
      // Reacciona al cambio de rol en el switcher superior
      if (this.auth.isBasicUser()) {
        this.selectedPatientId = this.auth.currentUser().patientId || 1;
      } else if (this.auth.isDoctor()) {
        this.newRecord.idMedico = this.auth.currentUser().doctorId || 2;
      }
      this.loadPatientRecords();
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['patientId'] && this.auth.canManageRecords()) {
        this.selectedPatientId = parseInt(params['patientId'], 10);
      } else if (this.auth.isBasicUser()) {
        this.selectedPatientId = this.auth.currentUser().patientId || 1;
      }
      this.loadPatientRecords();
    });

    if (this.auth.canManageRecords()) {
      this.api.getPatients().subscribe((p) => this.patients.set(p));
      this.api.getPharmacySummary().subscribe((s) => this.pharmacySummary.set(s));
      this.api.getMedicamentos().subscribe((m) => this.pharmacyStock.set(m));
    }
    this.api.getDoctors().subscribe((d) => this.doctors.set(d));
  }

  loadPatientRecords(): void {
    this.isFtsMode.set(false);
    const targetId = this.auth.isBasicUser()
      ? (this.auth.currentUser().patientId || 1)
      : this.selectedPatientId;

    this.api.getRecordsByPatient(targetId).subscribe({
      next: (data) => this.records.set(data || []),
      error: (err) => console.error('Error al cargar historial médico:', err),
    });
  }

  searchFts(): void {
    const query = this.ftsQuery.trim();
    if (!query) {
      this.loadPatientRecords();
      return;
    }

    if (this.auth.isBasicUser()) {
      this.isFtsMode.set(true);
      const current = this.records();
      const filtered = current.filter((r) => {
        const text = `${r.diagnosticoDescripcion || r.diagnostico_descripcion || ''} ${r.tratamiento || ''} ${r.diagnosticoCodigoCie || r.diagnostico_codigo_cie || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });
      this.records.set(filtered);
    } else {
      this.isFtsMode.set(true);
      this.api.searchClinicalRecords(query).subscribe({
        next: (data) => this.records.set(data || []),
        error: (err) => console.error(err),
      });
    }
  }

  clearSearch(): void {
    this.ftsQuery = '';
    this.loadPatientRecords();
  }

  openModal(): void {
    this.openNewModal();
  }

  openNewModal(): void {
    if (this.auth.isBasicUser()) return;
    this.editingRecordId = null;
    this.newRecord = {
      idPaciente: this.selectedPatientId,
      idMedico: this.auth.currentUser().doctorId || 2,
      diagnosticoCodigoCie: '',
      diagnosticoDescripcion: '',
      tratamiento: '',
      signosVitales: {
        presion_arterial: '120/80',
        frecuencia_cardiaca_lpm: 72,
        temperatura_c: 36.5,
        peso_kg: 70,
        oxigeno_pct: 98,
      },
      recetaMedicamentos: [],
    };
    this.drugName = '';
    this.drugDose = '';
    this.drugFreq = '';
    this.drugDays = 30;
    this.showModal.set(true);
  }

  openEditModal(record: any): void {
    if (!this.auth.canManageRecords()) return;
    this.editingRecordId = record.idHistoria || record.id_historia;
    this.newRecord = {
      idPaciente: record.idPaciente || record.id_paciente || this.selectedPatientId,
      idMedico: record.idMedico || record.id_medico || (this.auth.currentUser().doctorId || 2),
      diagnosticoCodigoCie: record.diagnosticoCodigoCie || record.diagnostico_codigo_cie || '',
      diagnosticoDescripcion: record.diagnosticoDescripcion || record.diagnostico_descripcion || '',
      tratamiento: record.tratamiento || '',
      signosVitales: {
        presion_arterial: '120/80',
        frecuencia_cardiaca_lpm: 72,
        temperatura_c: 36.5,
        peso_kg: 70,
        oxigeno_pct: 98,
        ...(record.signosVitales || record.signos_vitales || {}),
      },
      recetaMedicamentos: [],
    };

    const recetas = record.recetaMedicamentos || record.receta_medicamentos || [];
    if (recetas.length > 0) {
      this.drugName = recetas[0].medicamento || '';
      this.drugDose = recetas[0].dosis || '';
      this.drugFreq = recetas[0].frecuencia || '';
      this.drugDays = recetas[0].dias || 30;
    } else {
      this.drugName = '';
      this.drugDose = '';
      this.drugFreq = '';
      this.drugDays = 30;
    }

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingRecordId = null;
  }

  submitRecord(event: Event): void {
    event.preventDefault();
    if (this.drugName) {
      this.newRecord.recetaMedicamentos = [
        {
          medicamento: this.drugName,
          dosis: this.drugDose,
          frecuencia: this.drugFreq,
          dias: this.drugDays,
        },
      ];
    } else {
      this.newRecord.recetaMedicamentos = [];
    }

    if (this.editingRecordId) {
      this.api.updateMedicalRecord(this.editingRecordId, this.newRecord).subscribe({
        next: () => {
          this.closeModal();
          this.loadPatientRecords();
          this.toast.success('Nota de evolución clínica actualizada y guardada con éxito.');
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Error al actualizar la nota médica.');
        },
      });
    } else {
      this.api.createMedicalRecord(this.newRecord).subscribe({
        next: () => {
          this.closeModal();
          this.loadPatientRecords();
          this.toast.success('Nota clínica y prescripción registradas conforme a NOM-004.');
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Error al guardar la nota médica en el expediente.');
        },
      });
    }
  }

  printPrescription(r: any): void {
    const docName = r.medico?.nombre ? `Dr/a. ${r.medico.nombre} ${r.medico.apellido}` : (r.medico || 'Cuerpo Médico');
    const patName = r.paciente?.nombre ? `${r.paciente.nombre} ${r.paciente.apellido}` : 'Juan Pérez García';
    const dateStr = new Date(r.fecha_atencion || r.fechaAtencion || Date.now()).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const recetas = r.receta_medicamentos || r.recetaMedicamentos || [];
    const cie = r.diagnostico_codigo_cie || r.diagnosticoCodigoCie || 'N/A';
    const diag = r.diagnostico_descripcion || r.diagnosticoDescripcion || 'Consulta Médica General';
    const sv = r.signos_vitales || r.signosVitales;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <title>Receta Médica Oficial - Centro Médico Nacional</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 22px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
          .section { margin-bottom: 18px; padding: 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 8px; letter-spacing: 0.5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { text-align: left; padding: 8px 10px; background: #e2e8f0; font-size: 11px; text-transform: uppercase; color: #334155; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
          .signature { text-align: center; width: 250px; }
          .sig-line { border-top: 1px solid #334155; margin-top: 40px; padding-top: 5px; font-weight: bold; font-size: 12px; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">🏥 CENTRO MÉDICO NACIONAL</div>
            <div class="sub">Clínica de Especialidades y Hospitalización • NOM-004-SSA3-2012</div>
          </div>
          <div style="text-align: right;">
            <span class="badge">RECETA CLÍNICA ELECTRÓNICA</span>
            <div class="sub" style="margin-top: 6px;">Folio Expediente: EXP-${r.id_historia || r.idHistoria || '101'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Datos de la Consulta y Paciente</div>
          <div class="grid">
            <div><strong>Paciente:</strong> ${patName}</div>
            <div><strong>Fecha de Atención:</strong> ${dateStr}</div>
            <div><strong>Médico Tratante:</strong> ${docName}</div>
            <div><strong>Diagnóstico CIE-10:</strong> [${cie}] ${diag}</div>
          </div>
          ${sv ? `
            <div style="margin-top: 10px; font-size: 12px; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
              <strong>Signos Vitales:</strong> TA: ${sv.presion_arterial || '120/80'} mmHg • FC: ${sv.frecuencia_cardiaca_lpm || 75} lpm • Temp: ${sv.temperatura_c || 36.6}°C • Peso: ${sv.peso_kg || 78} kg • SpO2: ${sv.oxigeno_pct || 99}%
            </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Prescripción Farmacológica e Indicaciones de Toma</div>
          ${recetas.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Fármaco / Principio Activo</th>
                  <th>Dosis</th>
                  <th>Frecuencia</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                ${recetas.map((m: any) => `
                  <tr>
                    <td><strong>${m.medicamento}</strong></td>
                    <td>${m.dosis}</td>
                    <td>${m.frecuencia}</td>
                    <td>${m.dias} días</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="font-size: 12px; color: #64748b; margin: 5px 0;">No se indicaron fármacos específicos en esta consulta.</p>'}

          ${r.tratamiento ? `
            <div style="margin-top: 15px; font-size: 12px;">
              <strong>Indicaciones Generales de Cuidado:</strong>
              <p style="margin: 4px 0; color: #334155; line-height: 1.5;">${r.tratamiento}</p>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div style="font-size: 10px; color: #94a3b8; max-width: 320px;">
            Documento médico legal inmutable generado por Centro Médico Nacional conforme a NOM-024-SSA3-2012 y NOM-004-SSA3-2012.
          </div>
          <div class="signature">
            <div class="sig-line">
              ${docName}<br>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">Cédula Profesional / Matrícula Médica</span>
            </div>
          </div>
        </div>

        <div class="no-print" style="margin-top: 25px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 24px; font-size: 14px; font-weight: bold; background: #0284c7; color: white; border: none; border-radius: 8px; cursor: pointer;">
            🖨️ Imprimir / Guardar en PDF
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
