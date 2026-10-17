import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getExecutiveMetrics(): Promise<any> {
    // 1. Total pacientes
    const patientsCountRes = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM paciente;`,
    );
    const totalPatients = parseInt(patientsCountRes[0].total, 10);

    // 2. Turnos atendidos, cancelados y pendientes
    const appointmentsRes = await this.dataSource.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE estado = 'atendido') AS atendidos,
        COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'confirmado') AS confirmados,
        COUNT(*) FILTER (WHERE estado = 'cancelado') AS cancelados
      FROM turno;
    `);
    const appointments = appointmentsRes[0];

    // 3. Ocupación de camas
    const bedsRes = await this.dataSource.query(`
      SELECT 
        COUNT(*) AS total_camas,
        COUNT(*) FILTER (WHERE id_habitacion IN (
          SELECT id_habitacion FROM internacion WHERE fecha_alta IS NULL
        )) AS camas_ocupadas
      FROM habitacion WHERE activa = TRUE;
    `);
    const totalCamas = parseInt(bedsRes[0].total_camas, 10) || 1;
    const camasOcupadas = parseInt(bedsRes[0].camas_ocupadas, 10) || 0;
    const porcentajeOcupacion = Math.round((camasOcupadas / totalCamas) * 100);

    // 4. Finanzas
    const revenueRes = await this.dataSource.query(`
      SELECT 
        COALESCE(SUM(monto_neto), 0) AS total_recaudado,
        COALESCE(SUM(descuento_cobertura), 0) AS total_descuentos_os,
        COALESCE(ROUND(AVG(monto_neto), 2), 0) AS ticket_promedio
      FROM pago 
      WHERE estado = 'completado';
    `);
    const finances = revenueRes[0];

    // 5. Últimas internaciones activas
    const activeStays = await this.dataSource.query(`
      SELECT 
        i.id_internacion,
        p.nombre || ' ' || p.apellido AS paciente,
        p.dni,
        h.numero AS habitacion,
        h.tipo AS tipo_habitacion,
        i.fecha_ingreso,
        i.diagnostico_ingreso
      FROM internacion i
      JOIN paciente p ON i.id_paciente = p.id_paciente
      JOIN habitacion h ON i.id_habitacion = h.id_habitacion
      WHERE i.fecha_alta IS NULL
      ORDER BY i.fecha_ingreso DESC
      LIMIT 5;
    `);

    // 6. Próximos turnos confirmados/pendientes
    const upcomingAppointments = await this.dataSource.query(`
      SELECT 
        t.id_turno,
        lower(t.horario_rango) AS fecha_hora,
        p.nombre || ' ' || p.apellido AS paciente,
        'Dr/a. ' || m.apellido AS medico,
        e.nombre AS especialidad,
        t.estado,
        t.motivo_consulta
      FROM turno t
      JOIN paciente p ON t.id_paciente = p.id_paciente
      JOIN medico m ON t.id_medico = m.id_medico
      JOIN especialidad e ON t.id_especialidad = e.id_especialidad
      WHERE t.estado IN ('confirmado', 'pendiente')
      ORDER BY lower(t.horario_rango) ASC
      LIMIT 5;
    `);

    return {
      kpis: {
        totalPatients,
        totalAppointments: parseInt(appointments.total, 10),
        appointmentsAttended: parseInt(appointments.atendidos, 10),
        appointmentsPending: parseInt(appointments.pendientes, 10) + parseInt(appointments.confirmados, 10),
        appointmentsCanceled: parseInt(appointments.cancelados, 10),
        totalBeds: totalCamas,
        occupiedBeds: camasOcupadas,
        occupancyRate: porcentajeOcupacion,
        totalRevenue: parseFloat(finances.total_recaudado),
        totalInsuranceDiscount: parseFloat(finances.total_descuentos_os),
        averageTicket: parseFloat(finances.ticket_promedio),
      },
      activeHospitalizations: activeStays,
      upcomingAppointments,
    };
  }
}
