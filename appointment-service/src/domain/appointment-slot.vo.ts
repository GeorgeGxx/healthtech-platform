export class AppointmentSlot {
  readonly startTime: Date;
  readonly endTime: Date;

  constructor(start: Date | string, end: Date | string) {
    this.startTime = new Date(start);
    this.endTime = new Date(end);

    if (isNaN(this.startTime.getTime()) || isNaN(this.endTime.getTime())) {
      throw new Error('The provided dates are invalid');
    }

    if (this.endTime <= this.startTime) {
      throw new Error('End time must be after start time');
    }

    const durationMinutes =
      (this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60);

    if (durationMinutes < 15) {
      throw new Error('Minimum appointment duration is 15 minutes');
    }

    if (durationMinutes > 180) {
      throw new Error('Maximum appointment duration is 180 minutes');
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
