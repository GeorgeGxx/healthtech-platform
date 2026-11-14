/**
 * Responsive HTML & Plain-Text Notification Templates - National Medical Center
 */

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const NOTIFICATION_TEMPLATES = {
  appointmentCreated: (data: {
    pacienteNombre: string;
    medicoNombre: string;
    especialidad: string;
    consultorio: string;
    fechaInicio: string;
    idTurno: number | string;
  }) => ({
    asunto: `Medical Appointment Confirmation #${data.idTurno} - National Medical Center`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">🏥 National Medical Center</h1>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Care Confirmation & Appointment Reminder</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${escapeHtml(data.pacienteNombre)}</strong>,</p>
          <p style="line-height: 1.5; color: #475569;">Your medical appointment has been successfully scheduled and confirmed in our clinical system.</p>
          
          <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Appointment ID:</strong> #${escapeHtml(data.idTurno)}</p>
            <p style="margin: 4px 0;"><strong>Specialist:</strong> ${escapeHtml(data.medicoNombre)}</p>
            <p style="margin: 4px 0;"><strong>Specialty:</strong> ${escapeHtml(data.especialidad)}</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${escapeHtml(data.consultorio)}</p>
            <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${escapeHtml(data.fechaInicio)}</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
            Please arrive at reception 15 minutes before your scheduled time with a valid photo ID and insurance card (if applicable).
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          National Medical Center • HIPAA & HL7 FHIR R4 Compliant
        </div>
      </div>
    `,
    sms: `National Medical Center: Appointment #${data.idTurno} confirmed with ${data.medicoNombre} (${data.especialidad}) on ${data.fechaInicio}. Please arrive 15 min early.`,
  }),

  appointmentCancelled: (data: {
    pacienteNombre: string;
    idTurno: number | string;
    motivo?: string;
  }) => ({
    asunto: `Appointment Cancellation #${data.idTurno} - National Medical Center`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #dc2626; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 20px;">Appointment Cancellation Notice</h2>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p>Dear <strong>${escapeHtml(data.pacienteNombre)}</strong>,</p>
          <p>We inform you that medical appointment <strong>#${escapeHtml(data.idTurno)}</strong> has been cancelled in our clinical schedule.</p>
          ${data.motivo ? `<p style="background: #fef2f2; padding: 12px; border-radius: 6px; color: #991b1b;"><strong>Reason:</strong> ${escapeHtml(data.motivo)}</p>` : ''}
          <p>You may reschedule your appointment anytime through our web portal or by contacting reception.</p>
        </div>
      </div>
    `,
    sms: `National Medical Center: Your appointment #${data.idTurno} has been cancelled. You can reschedule via our portal or by calling reception.`,
  }),

  stockAlert: (data: {
    medicamento: string;
    lote: string;
    stockActual: number;
    stockMinimo: number;
    ubicacion: string;
  }) => ({
    asunto: `🚨 CRITICAL STOCK ALERT: ${data.medicamento} - Hospital Pharmacy`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px;">
        <h3 style="color: #b45309; margin-top: 0;">⚠️ Pharmacy Restock Required</h3>
        <p>The medication <strong>${escapeHtml(data.medicamento)}</strong> has fallen below its safety minimum threshold.</p>
        <ul>
          <li><strong>Batch:</strong> ${escapeHtml(data.lote)}</li>
          <li><strong>Current Stock:</strong> ${escapeHtml(data.stockActual)} units</li>
          <li><strong>Minimum Stock:</strong> ${escapeHtml(data.stockMinimo)} units</li>
          <li><strong>Warehouse Location:</strong> ${escapeHtml(data.ubicacion)}</li>
        </ul>
      </div>
    `,
    sms: `PHARMACY ALERT: Critical stock for ${data.medicamento} (Current: ${data.stockActual}, Min: ${data.stockMinimo}). Location: ${data.ubicacion}.`,
  }),

  sagaAlert: (data: {
    idSaga: string;
    nombreSaga: string;
    estado: string;
    error?: string;
  }) => ({
    asunto: `Distributed Transaction Notification (Saga: ${data.nombreSaga})`,
    html: `
      <div style="font-family: monospace; padding: 16px; background: #0f172a; color: #38bdf8; border-radius: 8px;">
        <h4 style="margin: 0; color: #f8fafc;">Saga Coordinator Notification</h4>
        <p>ID: ${escapeHtml(data.idSaga)} | Status: ${escapeHtml(data.estado)}</p>
        ${data.error ? `<p style="color: #f87171;">Compensation executed: ${escapeHtml(data.error)}</p>` : '<p style="color: #4ade80;">Transaction completed end-to-end successfully</p>'}
      </div>
    `,
    sms: `SAGA [${data.nombreSaga}]: Final status ${data.estado}.`,
  }),

  paymentReceipt: (data: {
    pacienteNombre: string;
    idPago: number | string;
    montoNeto: number;
    metodoPago: string;
    comprobanteFiscal: string;
    concepto: string;
  }) => ({
    asunto: `Payment Receipt #${data.idPago} (${data.comprobanteFiscal}) - National Medical Center`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px;">💳 Electronic Payment Receipt</h1>
          <p style="margin: 6px 0 0; font-size: 14px;">National Medical Center</p>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p>Dear <strong>${escapeHtml(data.pacienteNombre)}</strong>,</p>
          <p>We have successfully received your payment:</p>
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Receipt ID:</strong> ${escapeHtml(data.comprobanteFiscal)}</p>
            <p style="margin: 4px 0;"><strong>Concept:</strong> ${escapeHtml(data.concepto)}</p>
            <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${escapeHtml(data.metodoPago)}</p>
            <p style="margin: 4px 0; font-size: 18px; color: #047857;"><strong>Total Paid:</strong> $${Number(data.montoNeto).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</p>
          </div>
        </div>
      </div>
    `,
    sms: `National Medical Center: Payment received for $${data.montoNeto} USD (${data.comprobanteFiscal}). Thank you.`,
  }),
};
