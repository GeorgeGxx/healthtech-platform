import { describe, it, expect } from 'vitest';
import { AppointmentSlot } from '../../src/domain/appointment-slot.vo.js';

describe('TDD: AppointmentSlot Value Object', () => {
  it('should create a valid 30-minute appointment slot', () => {
    const slot = new AppointmentSlot(
      '2026-11-05T09:00:00Z',
      '2026-11-05T09:30:00Z',
    );
    expect(slot.startTime.toISOString()).toBe('2026-11-05T09:00:00.000Z');
    expect(slot.endTime.toISOString()).toBe('2026-11-05T09:30:00.000Z');
  });

  it('should fail if end time is equal to or before start time', () => {
    expect(
      () =>
        new AppointmentSlot(
          '2026-11-05T10:00:00Z',
          '2026-11-05T09:30:00Z',
        ),
    ).toThrow('End time must be after start time');
  });

  it('should fail if duration is less than 15 minutes', () => {
    expect(
      () =>
        new AppointmentSlot(
          '2026-11-05T09:00:00Z',
          '2026-11-05T09:10:00Z',
        ),
    ).toThrow('Minimum appointment duration is 15 minutes');
  });

  it('should accurately detect overlap between two concurrent slots', () => {
    const slot1 = new AppointmentSlot(
      '2026-11-05T09:00:00Z',
      '2026-11-05T09:30:00Z',
    );
    const slot2 = new AppointmentSlot(
      '2026-11-05T09:15:00Z',
      '2026-11-05T09:45:00Z',
    );

    expect(slot1.overlapsWith(slot2)).toBe(true);
    expect(slot2.overlapsWith(slot1)).toBe(true);
  });

  it('should not detect overlap for contiguous consecutive slots', () => {
    const slot1 = new AppointmentSlot(
      '2026-11-05T09:00:00Z',
      '2026-11-05T09:30:00Z',
    );
    const slot2 = new AppointmentSlot(
      '2026-11-05T09:30:00Z',
      '2026-11-05T10:00:00Z',
    );

    expect(slot1.overlapsWith(slot2)).toBe(false);
    expect(slot2.overlapsWith(slot1)).toBe(false);
  });
});
