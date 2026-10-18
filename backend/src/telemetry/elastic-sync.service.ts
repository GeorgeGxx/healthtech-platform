import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ElasticSyncService {
  private readonly logger = new Logger(ElasticSyncService.name);
  private readonly esUrl = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';

  /**
   * Sincroniza un cobro o factura en tiempo real en healthtech-clinical-operations
   */
  async syncPayment(payment: any, patientName: string, insurer: string, conceptName: string): Promise<void> {
    try {
      const docId = payment.comprobanteFiscal || `PAGO-${payment.idPago}`;
      const payload = {
        operacion_id: docId,
        tipo_evento: payment.idInternacion ? 'internacion' : 'facturacion',
        especialidad: conceptName || 'Consulta Médica',
        medico: 'Dr/a. Médico Tratante',
        paciente: patientName || 'Paciente',
        estado: payment.estado || 'completado',
        aseguradora: insurer || 'Particular/Ninguno',
        monto_total_mxn: Number(payment.montoBruto || 0),
        monto_mxn: Number(payment.montoBruto || 0),
        monto_neto_mxn: Number(payment.montoNeto || payment.montoBruto || 0),
        copago_mxn: Number(payment.montoNeto || payment.montoBruto || 0),
        descuento_cobertura_mxn: Number(payment.descuentoCobertura || 0),
        fecha_pago: payment.fechaPago || new Date().toISOString(),
        '@timestamp': new Date().toISOString(),
      };

      const res = await fetch(`${this.esUrl}/healthtech-clinical-operations/_doc/${encodeURIComponent(docId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.logger.log(`✓ Pago ${docId} sincronizado en tiempo real con Elasticsearch (Kibana)`);
      } else {
        const txt = await res.text();
        this.logger.warn(`Error al sincronizar pago en Elasticsearch: ${txt}`);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo conectar a Elasticsearch para sincronizar pago: ${err.message}`);
    }
  }

  /**
   * Sincroniza el inventario de un fármaco en healthtech-pharmacy-stock
   */
  async syncMedication(med: any): Promise<void> {
    try {
      const docId = med.idMedicamento;
      const payload = {
        medicamento_id: med.idMedicamento,
        nombre_comercial: med.nombreComercial,
        principio_activo: med.principioActivo,
        categoria_terapeutica: med.categoriaTerapeutica,
        presentacion: med.presentacion,
        lote: med.lote,
        caducidad: med.caducidad,
        stock_actual: med.stockActual,
        stock_minimo: med.stockMinimo,
        stock_maximo: med.stockMaximo,
        nivel_alerta: med.nivelAlerta,
        ubicacion_almacen: med.ubicacionAlmacen,
        precio_unitario_mxn: Number(med.precioUnitarioMxn),
        costo_total_inventario_mxn: Number(med.precioUnitarioMxn) * Number(med.stockActual),
        '@timestamp': new Date().toISOString(),
      };

      await fetch(`${this.esUrl}/healthtech-pharmacy-stock/_doc/${encodeURIComponent(docId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo sincronizar medicamento ${med.idMedicamento}: ${err.message}`);
    }
  }

  /**
   * Sincroniza el estado de una cama hospitalaria en healthtech-beds-census
   */
  async syncBed(bed: any): Promise<void> {
    try {
      const docId = `CAMA-${bed.idHabitacion || bed.numero}`;
      const payload = {
        cama_id: docId,
        numero: bed.numero,
        piso: bed.piso,
        tipo: bed.tipo,
        estado: bed.ocupada ? 'Ocupada' : 'Disponible',
        tarifa_noche_mxn: Number(bed.costoDia || 0),
        paciente_nombre: bed.pacienteActual?.nombreCompleto || (bed.ocupada ? 'Paciente Internado' : 'Sin asignar'),
        medico_responsable: bed.pacienteActual?.medicoTratante || 'Equipo Médico de Piso',
        dias_estancia: bed.pacienteActual?.diasEstancia || 0,
        diagnostico_ingreso: bed.pacienteActual?.diagnosticoIngreso || 'N/A',
        '@timestamp': new Date().toISOString(),
      };

      await fetch(`${this.esUrl}/healthtech-beds-census/_doc/${encodeURIComponent(docId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo sincronizar cama ${bed.numero}: ${err.message}`);
    }
  }
}
