/**
 * Plantillas HTML Responsivas y Texto Plano con Branding Centro Médico Nacional
 */

export const NOTIFICATION_TEMPLATES = {
  appointmentCreated: (data: {
    pacienteNombre: string;
    medicoNombre: string;
    especialidad: string;
    consultorio: string;
    fechaInicio: string;
    idTurno: number | string;
  }) => ({
    asunto: `Confirmación de Cita Médica #${data.idTurno} - Centro Médico Nacional`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">🏥 Centro Médico Nacional</h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Confirmación Asistencial y Recordatorio de Turno</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p style="font-size: 16px; margin-top: 0;">Estimado(a) <strong>${data.pacienteNombre}</strong>,</p>
          <p style="line-height: 1.5; color: #475569;">Su turno médico ha sido registrado y confirmado exitosamente en nuestro sistema asistencial.</p>
          
          <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Folio de Cita:</strong> #${data.idTurno}</p>
            <p style="margin: 4px 0;"><strong>Especialista:</strong> ${data.medicoNombre}</p>
            <p style="margin: 4px 0;"><strong>Especialidad:</strong> ${data.especialidad}</p>
            <p style="margin: 4px 0;"><strong>Ubicación:</strong> ${data.consultorio}</p>
            <p style="margin: 4px 0;"><strong>Fecha y Hora:</strong> ${data.fechaInicio}</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
            Le solicitamos presentarse en recepción 15 minutos antes de su horario con una identificación oficial con fotografía y credencial de seguro (en caso de aplicar cobertura).
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Centro Médico Nacional • Cumplimiento Normativo HIPAA & NOM-024-SSA3-2012 • México
        </div>
      </div>
    `,
    sms: `Centro Medico: Cita #${data.idTurno} confirmada con ${data.medicoNombre} (${data.especialidad}) el ${data.fechaInicio}. Favor de llegar 15 min antes.`,
  }),

  appointmentCancelled: (data: {
    pacienteNombre: string;
    idTurno: number | string;
    motivo?: string;
  }) => ({
    asunto: `Cancelación de Turno Médico #${data.idTurno} - Centro Médico Nacional`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #dc2626; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Aviso de Cancelación de Cita</h2>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p>Estimado(a) <strong>${data.pacienteNombre}</strong>,</p>
          <p>Le notificamos que el turno médico con folio <strong>#${data.idTurno}</strong> ha sido cancelado en agenda asistencial.</p>
          ${data.motivo ? `<p style="background: #fef2f2; padding: 12px; border-radius: 6px; color: #991b1b;"><strong>Motivo:</strong> ${data.motivo}</p>` : ''}
          <p>Puede reprogramar su cita en cualquier momento desde el portal web o comunicándose a recepción.</p>
        </div>
      </div>
    `,
    sms: `Centro Medico: Su cita #${data.idTurno} ha sido cancelada. Puede reprogramar en nuestro portal o llamando a recepcion.`,
  }),

  stockAlert: (data: {
    medicamento: string;
    lote: string;
    stockActual: number;
    stockMinimo: number;
    ubicacion: string;
  }) => ({
    asunto: `🚨 ALERTA DE STOCK CRÍTICO: ${data.medicamento} - Farmacia Hospitalaria`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px;">
        <h3 style="color: #b45309; margin-top: 0;">⚠️ Reabastecimiento Requerido en Farmacia</h3>
        <p>El medicamento <strong>${data.medicamento}</strong> ha alcanzado un umbral por debajo del mínimo de seguridad.</p>
        <ul>
          <li><strong>Lote:</strong> ${data.lote}</li>
          <li><strong>Stock Actual:</strong> ${data.stockActual} unidades</li>
          <li><strong>Stock Mínimo:</strong> ${data.stockMinimo} unidades</li>
          <li><strong>Ubicación en Almacén:</strong> ${data.ubicacion}</li>
        </ul>
      </div>
    `,
    sms: `ALERTA FARMACIA: Stock critico de ${data.medicamento} (Actual: ${data.stockActual}, Min: ${data.stockMinimo}). Ubicacion: ${data.ubicacion}.`,
  }),

  sagaAlert: (data: {
    idSaga: string;
    nombreSaga: string;
    estado: string;
    error?: string;
  }) => ({
    asunto: `Notificación de Transacción Distribuida (Saga: ${data.nombreSaga})`,
    html: `
      <div style="font-family: monospace; padding: 16px; background: #0f172a; color: #38bdf8; border-radius: 8px;">
        <h4 style="margin: 0; color: #f8fafc;">Saga Coordinator Notification</h4>
        <p>ID: ${data.idSaga} | Estado: ${data.estado}</p>
        ${data.error ? `<p style="color: #f87171;">Compensación ejecutada: ${data.error}</p>` : '<p style="color: #4ade80;">Transacción ejecutada con éxito de punta a punta</p>'}
      </div>
    `,
    sms: `SAGA [${data.nombreSaga}]: Estado final ${data.estado}.`,
  }),

  paymentReceipt: (data: {
    pacienteNombre: string;
    idPago: number | string;
    montoNeto: number;
    metodoPago: string;
    comprobanteFiscal: string;
    concepto: string;
  }) => ({
    asunto: `Comprobante de Pago #${data.idPago} (${data.comprobanteFiscal}) - Centro Médico Nacional`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px;">💳 Comprobante de Pago Electrónico</h1>
          <p style="margin: 6px 0 0; font-size: 14px;">Centro Médico Nacional</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p>Estimado(a) <strong>${data.pacienteNombre}</strong>,</p>
          <p>Hemos recibido su pago satisfactoriamente:</p>
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Folio Fiscal:</strong> ${data.comprobanteFiscal}</p>
            <p style="margin: 4px 0;"><strong>Concepto:</strong> ${data.concepto}</p>
            <p style="margin: 4px 0;"><strong>Método de Pago:</strong> ${data.metodoPago}</p>
            <p style="margin: 4px 0; font-size: 18px; color: #047857;"><strong>Total Pagado:</strong> $${Number(data.montoNeto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
          </div>
        </div>
      </div>
    `,
    sms: `Centro Medico: Pago recibido por $${data.montoNeto} MXN (${data.comprobanteFiscal}). Gracias por su preferencia.`,
  }),
};

