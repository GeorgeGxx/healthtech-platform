export class AppointmentSlot {
  readonly startTime: Date;
  readonly endTime: Date;

  constructor(start: Date | string, end: Date | string) {
    this.startTime = new Date(start);
    this.endTime = new Date(end);

    if (isNaN(this.startTime.getTime()) || isNaN(this.endTime.getTime())) {
      throw new Error('Las fechas ingresadas son inválidas');
    }

    if (this.endTime <= this.startTime) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    const durationMinutes =
      (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60);

    if (durationMinutes < 15) {
      throw new Error('La duración mínima de una cita es de 15 minutos');
    }

    if (durationMinutes > 180) {
      throw new Error('La duración máxima de una cita es de 180 minutos');
    }
  }

  overlapsWith(other: AppointmentSlot): boolean {
    return (
      this.startTime < other.endTime && this.endTime > other.startTime
    );
  }

  toPostgresRangeString(): string {
    return `["${this.startTime.toISOString()}","${this.endTime.toISOString()}"]`;
  }

  static parseRange(horarioRango?: string | null): { inicio: string | null; fin: string | null } {
    if (!horarioRango) {
      return { inicio: null, fin: null };
    }

    const match = horarioRango.match(/\["([^"]+)",\s*"([^"]+)"\)/);
    if (match) {
      return { inicio: match[1], fin: match[2] };
    }

    const parts = horarioRango.replace(/[\[\)"']/g, '').split(',');
    if (parts.length === 2) {
      return { inicio: parts[0].trim(), fin: parts[1].trim() };
    }

    return { inicio: null, fin: null };
  }
}
