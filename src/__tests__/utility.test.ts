import { DateTime } from 'luxon';
import { buildDateTimeFromWeek, isOverlapping, isSlotBlocked } from '../utils';

describe('buildDateTimeFromWeek', () => {
  const baseDate = DateTime.local(2024, 12, 18).setZone('Europe/Helsinki');

  it('should create a DateTime object for a specific weekday and time', () => {
    const timeInWeek = { weekday: 6, hour: 14, minute: 30 };
    const result = buildDateTimeFromWeek(baseDate, timeInWeek);

    expect(result.toISO()).toEqual('2024-12-21T14:30:00.000+02:00');
  });

  it('should handle missing minute values (default to 0)', () => {
    const timeInWeek = { weekday: 6, hour: 14 };
    const result = buildDateTimeFromWeek(baseDate, timeInWeek);

    expect(result.toISO()).toEqual('2024-12-21T14:00:00.000+02:00');
  });

  it('should throw if the weekday is invalid', () => {
    const timeInWeek = { weekday: 8, hour: 14 };
    expect(() => buildDateTimeFromWeek(baseDate, timeInWeek)).toThrow(
      'Invalid weekday: 8. Weekday must be between 1 (Monday) and 7 (Sunday).'
    );
  });
});

describe('isOverlapping', () => {
  const slotA = {
    from: DateTime.local(2024, 12, 18, 10, 0),
    to: DateTime.local(2024, 12, 18, 11, 0),
  };

  it('should return true for overlapping slots', () => {
    const slotB = {
      from: DateTime.local(2024, 12, 18, 10, 30),
      to: DateTime.local(2024, 12, 18, 11, 30),
    };

    expect(isOverlapping(slotA, slotB)).toBe(true);
  });

  it('should return false for non-overlapping slots', () => {
    const slotB = {
      from: DateTime.local(2024, 12, 18, 11, 0),
      to: DateTime.local(2024, 12, 18, 12, 0),
    };

    expect(isOverlapping(slotA, slotB)).toBe(false);
  });

  it('should return false for slots that just touch', () => {
    const slotB = {
      from: DateTime.local(2024, 12, 18, 11, 0),
      to: DateTime.local(2024, 12, 18, 12, 0),
    };

    expect(isOverlapping(slotA, slotB)).toBe(false);
  });
});

describe('isSlotBlocked', () => {
  const bookings = [
    {
      from: DateTime.local(2024, 12, 18, 10, 0),
      to: DateTime.local(2024, 12, 18, 11, 0),
    },
    {
      from: DateTime.local(2024, 12, 18, 12, 0),
      to: DateTime.local(2024, 12, 18, 13, 0),
    },
  ];

  it('should return true for a slot overlapping with a booking', () => {
    const slot = {
      from: DateTime.local(2024, 12, 18, 10, 30),
      to: DateTime.local(2024, 12, 18, 11, 30),
    };

    expect(isSlotBlocked(slot, bookings)).toBe(true);
  });

  it('should return false for a slot not overlapping with any booking', () => {
    const slot = {
      from: DateTime.local(2024, 12, 18, 11, 0),
      to: DateTime.local(2024, 12, 18, 12, 0),
    };

    expect(isSlotBlocked(slot, bookings)).toBe(false);
  });
});
