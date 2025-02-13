import { DateTime } from 'luxon';
import generateSlots from '../generateSlots';
import { AvailabilityData } from '../types';

describe('generateSlots', () => {
  // You modify this sample data for the needs of each of your tests.
  let bookableData1: AvailabilityData;

  beforeEach(() => {
    bookableData1 = buildDefaultAvailability();
  });

  it('should not throw', () => {
    bookableData1.durationMinutes = 30;
    const now = DateTime.local(2023, 12, 12, 6, 30);
    expect(() => generateSlots(now, bookableData1)).not.toThrow();
  });

  it('should start slots at the beginning of the availability window', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 18 },
        to: { weekday: 6, hour: 20, minute: 30 },
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 18, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 20, 0),
        },
      ],
    });
  });

  it('should exclude slots that do not fit inside the availability window', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 18 },
        to: { weekday: 6, hour: 19, minute: 30 },
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 18, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
        },
      ],
    });
  });

  it('should handle availability windows in multiple days', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 18 },
        to: { weekday: 6, hour: 20 },
      },
      {
        from: { weekday: 7, hour: 18 },
        to: { weekday: 7, hour: 20 },
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 18, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 20, 0),
        },
      ],
      '2024-12-22': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 22, 18, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 19, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 22, 19, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 20, 0),
        },
      ],
    });
  });

  it('should block slots that overlap with existing bookings', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 18 },
        to: { weekday: 6, hour: 20, minute: 30 },
      },
    ];

    bookableData1.bookings = [
      {
        from: formatDateTime(bookableData1, 2024, 12, 21, 18, 0),
        to: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 20, 0),
        },
      ],
    });
  });

  it('should handle availability windows spanning next days', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 22 },
        to: { weekday: 6, hour: 2 },
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 22, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 23, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 23, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 0, 0),
        },
      ],
      '2024-12-22': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 22, 0, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 1, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 22, 1, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 2, 0),
        },
      ],
    });
  });

  it('should respect the mustBookHoursBefore constraint', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18, 10, 53);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 3, hour: 12 },
        to: { weekday: 3, hour: 16 },
      },
    ];

    bookableData1.mustBookHoursBefore = 4;

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-18': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 18, 15, 0),
          to: formatDateTime(bookableData1, 2024, 12, 18, 16, 0),
        },
      ],
    });
  });

  it('should return an empty result when no availability windows are defined', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);
    bookableData1.availabilityWindows = []; // No availability

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({});
  });

  it('should return an empty result when durationMinutes is zero', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);
    bookableData1.durationMinutes = 0;

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({});
  });

  it('should handle availability windows ending exactly at midnight', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 20 },
        to: { weekday: 6, hour: 0 },
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 20, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 21, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 21, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 22, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 22, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 23, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 23, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 0, 0),
        },
      ],
    });
  });

  it('should block slots across multiple days for bookings spanning multiple days', () => {
    const now = formatDateTime(bookableData1, 2024, 12, 18);

    bookableData1.availabilityWindows = [
      {
        from: { weekday: 6, hour: 18 },
        to: { weekday: 6, hour: 23 },
      },
      {
        from: { weekday: 7, hour: 0 },
        to: { weekday: 7, hour: 2 },
      },
    ];

    bookableData1.bookings = [
      {
        from: formatDateTime(bookableData1, 2024, 12, 21, 22, 0),
        to: formatDateTime(bookableData1, 2024, 12, 22, 1, 0),
      },
    ];

    const result = generateSlots(now, bookableData1);

    expect(result).toEqual({
      '2024-12-21': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 18, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 19, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 20, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 20, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 21, 0),
        },
        {
          from: formatDateTime(bookableData1, 2024, 12, 21, 21, 0),
          to: formatDateTime(bookableData1, 2024, 12, 21, 22, 0),
        },
      ],
      '2024-12-22': [
        {
          from: formatDateTime(bookableData1, 2024, 12, 22, 1, 0),
          to: formatDateTime(bookableData1, 2024, 12, 22, 2, 0),
        },
      ],
    });
  });
});

function buildDefaultAvailability(): AvailabilityData {
  const weekdays = Array.from({ length: 7 }, (_, i) => i + 1);
  return {
    calendarLengthDays: 7,
    availabilityWindows: weekdays.map((weekday) => ({
      from: {
        weekday,
        hour: 8,
      },
      to: {
        weekday,
        hour: 16,
      },
    })),
    durationMinutes: 60,
    mustBookHoursBefore: 1,
    bookings: [],
    timezone: 'Europe/Helsinki',
  };
}

/**
 * Utility function to initialize the `now` variable with the proper timezone.
 */
function formatDateTime(
  bookableData: AvailabilityData,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): DateTime {
  return DateTime.local(year, month, day, hour, minute).setZone(
    bookableData.timezone
  );
}
