import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Roles } from '../auth/auth.decorators.js';

@ApiTags('Dashboard & Clinical KPIs')
@Roles('admin_user', 'doctor_user', 'nurse_user', 'receptionist_user')
@Controller('dashboard')
export class DashboardController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Aggregate clinical, bed occupancy, and billing KPIs for the dashboard' })
  @ApiResponse({ status: 200, description: 'Aggregated dashboard metrics' })
  async getMetrics() {
    const [
      [patientRow],
      [appointmentRow],
      [bedRow],
      [occupiedRow],
      [billingRow],
      activeHospitalizations,
      upcomingAppointments,
    ] = await Promise.all([
      this.dataSource.query(`SELECT COUNT(*)::int AS total FROM paciente`),
      this.dataSource.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'atendido')::int AS attended,
          COUNT(*) FILTER (WHERE estado IN ('pendiente', 'confirmado'))::int AS pending,
          COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS canceled
        FROM turno
      `),
      this.dataSource.query(`SELECT COUNT(*) FILTER (WHERE activa = TRUE)::int AS total_beds FROM habitacion`),
      this.dataSource.query(`SELECT COUNT(*) FILTER (WHERE fecha_alta IS NULL)::int AS occupied_beds FROM internacion`),
      this.dataSource.query(`
        SELECT
          COALESCE(SUM(monto_neto), 0)::float8 AS total_revenue,
          COALESCE(SUM(descuento_cobertura), 0)::float8 AS total_discount,
          COALESCE(AVG(monto_neto), 0)::float8 AS average_ticket
        FROM pago
        WHERE estado = 'completado'
      `),
      this.dataSource.query(`
        SELECT
          i.id_internacion AS "idInternacion",
          p.nombre || ' ' || p.apellido AS "patientName",
          h.numero AS "roomNumber",
          h.tipo AS "roomType",
          i.fecha_ingreso AS "admissionDate",
          i.diagnostico_ingreso AS "diagnosis"
        FROM internacion i
        JOIN paciente p ON p.id_paciente = i.id_paciente
        JOIN habitacion h ON h.id_habitacion = i.id_habitacion
        WHERE i.fecha_alta IS NULL
        ORDER BY i.fecha_ingreso DESC
        LIMIT 10
      `),
      this.dataSource.query(`
        SELECT
          t.id_turno AS "idTurno",
          p.nombre || ' ' || p.apellido AS "patientName",
          m.nombre || ' ' || m.apellido AS "doctorName",
          e.nombre AS "specialty",
          lower(t.horario_rango) AS "startTime",
          t.estado AS "status"
        FROM turno t
        JOIN paciente p ON p.id_paciente = t.id_paciente
        JOIN medico m ON m.id_medico = t.id_medico
        JOIN especialidad e ON e.id_especialidad = t.id_especialidad
        WHERE t.estado IN ('pendiente', 'confirmado')
        ORDER BY lower(t.horario_rango) ASC
        LIMIT 10
      `),
    ]);

    const totalBeds = Number(bedRow?.total_beds ?? 0);
    const occupiedBeds = Number(occupiedRow?.occupied_beds ?? 0);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0;

    return {
      kpis: {
        totalPatients: Number(patientRow?.total ?? 0),
        totalAppointments: Number(appointmentRow?.total ?? 0),
        appointmentsAttended: Number(appointmentRow?.attended ?? 0),
        appointmentsPending: Number(appointmentRow?.pending ?? 0),
        appointmentsCanceled: Number(appointmentRow?.canceled ?? 0),
        totalBeds,
        occupiedBeds,
        occupancyRate,
        totalRevenue: Math.round(Number(billingRow?.total_revenue ?? 0) * 100) / 100,
        totalInsuranceDiscount: Math.round(Number(billingRow?.total_discount ?? 0) * 100) / 100,
        averageTicket: Math.round(Number(billingRow?.average_ticket ?? 0) * 100) / 100,
      },
      activeHospitalizations,
      upcomingAppointments,
    };
  }
}
