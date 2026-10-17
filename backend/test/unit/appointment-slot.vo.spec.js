import { describe, it, expect } from 'vitest';
export class AppointmentSlot {
    startTime;
    endTime;
    constructor(start, end) {
        this.startTime = new Date(start);
        this.endTime = new Date(end);
        if (isNaN(this.startTime.getTime()) || isNaN(this.endTime.getTime())) {
            throw new Error('Las fechas ingresadas son inválidas');
        }
        if (this.endTime <= this.startTime) {
            throw new Error('La hora de fin debe ser posterior a la hora de inicio');
        }
        const durationMinutes = (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60);
        if (durationMinutes < 15) {
            throw new Error('La duración mínima de una cita es de 15 minutos');
        }
        if (durationMinutes > 180) {
            throw new Error('La duración máxima de una cita es de 180 minutos');
        }
    }
    overlapsWith(other) {
        return (this.startTime < other.endTime && this.endTime > other.startTime);
    }
    toPostgresRangeString() {
        return `["${this.startTime.toISOString()}","${this.endTime.toISOString()}"]`;
    }
}
describe('TDD: AppointmentSlot Value Object', () => {
    it('debe crear un slot de turno válido de 30 minutos', () => {
        const slot = new AppointmentSlot('2026-11-05T09:00:00Z', '2026-11-05T09:30:00Z');
        expect(slot.startTime.toISOString()).toBe('2026-11-05T09:00:00.000Z');
        expect(slot.endTime.toISOString()).toBe('2026-11-05T09:30:00.000Z');
    });
    it('debe fallar si la hora fin es igual o anterior a la hora inicio', () => {
        expect(() => new AppointmentSlot('2026-11-05T10:00:00Z', '2026-11-05T09:30:00Z')).toThrow('La hora de fin debe ser posterior a la hora de inicio');
    });
    it('debe fallar si la duración es inferior a 15 minutos', () => {
        expect(() => new AppointmentSlot('2026-11-05T09:00:00Z', '2026-11-05T09:10:00Z')).toThrow('La duración mínima de una cita es de 15 minutos');
    });
    it('debe detectar correctamente solapamiento entre dos turnos concurrentes', () => {
        const slot1 = new AppointmentSlot('2026-11-05T09:00:00Z', '2026-11-05T09:30:00Z');
        const slot2 = new AppointmentSlot('2026-11-05T09:15:00Z', '2026-11-05T09:45:00Z');
        expect(slot1.overlapsWith(slot2)).toBe(true);
        expect(slot2.overlapsWith(slot1)).toBe(true);
    });
    it('no debe detectar solapamiento en turnos consecutivos contiguos', () => {
        const slot1 = new AppointmentSlot('2026-11-05T09:00:00Z', '2026-11-05T09:30:00Z');
        const slot2 = new AppointmentSlot('2026-11-05T09:30:00Z', '2026-11-05T10:00:00Z');
        expect(slot1.overlapsWith(slot2)).toBe(false);
        expect(slot2.overlapsWith(slot1)).toBe(false);
    });
});
//# sourceMappingURL=appointment-slot.vo.spec.js.map