export declare class AppointmentSlot {
    readonly startTime: Date;
    readonly endTime: Date;
    constructor(start: Date | string, end: Date | string);
    overlapsWith(other: AppointmentSlot): boolean;
    toPostgresRangeString(): string;
}
