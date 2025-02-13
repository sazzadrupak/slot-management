import { DateTime } from 'luxon';
import { Availability, AvailabilityData, Slots, TimeSlot } from './types';
import { buildDateTimeFromWeek, isSlotBlocked } from './utils';

const DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Returns a list of slots for a given availability data.
 * @param now
 * @param availabilityData
 * @returns Slots
 */
export default function generateSlots(
  now: DateTime,
  availabilityData: AvailabilityData
): Slots {
  const result: Slots = {};
  const {
    calendarLengthDays,
    availabilityWindows,
    durationMinutes,
    mustBookHoursBefore,
    bookings,
    timezone,
  } = availabilityData;

  if (durationMinutes <= 0) {
    return result;
  }

  const startDate = now.setZone(timezone);
  const bookingTimezone = bookings.map((b) => ({
    from: b.from.setZone(timezone),
    to: b.to.setZone(timezone),
  }));

  for (let dayOffset = 0; dayOffset < calendarLengthDays; dayOffset++) {
    const currentDay = startDate.plus({ days: dayOffset });
    const daySlots = generateDaySlots(
      currentDay,
      availabilityWindows,
      durationMinutes,
      mustBookHoursBefore,
      now,
      bookingTimezone,
      calendarLengthDays
    );

    daySlots.forEach((slot) => {
      const slotDate = slot.from.toFormat(DATE_FORMAT);
      if (!result[slotDate]) {
        result[slotDate] = [];
      }
      result[slotDate].push(slot);
    });
  }
  return result;
}

/**
 * Generates slots for a given day based on availability windows and bookings.
 * @param currentDay
 * @param availabilityWindows
 * @param durationMinutes
 * @param mustBookHoursBefore
 * @param now
 * @param bookings
 * @returns TimeSlot[]
 */
function generateDaySlots(
  currentDay: DateTime,
  availabilityWindows: Availability[],
  durationMinutes: number,
  mustBookHoursBefore: number,
  now: DateTime,
  bookings: TimeSlot[],
  calendarLengthDays: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (const availability of availabilityWindows) {
    if (availability.from.weekday !== currentDay.weekday) continue;

    const { windowStart, windowEnd } = getWindowStartEnd(
      currentDay,
      availability,
      calendarLengthDays,
      now
    );

    // Skip if the current day is outside the availability window
    // We need to check if currentDay is entirely outside the window using both windowStart and windowEnd
    // currentDay: January 10, 2025.
    // windowStart: January 9, 2025, 22:00.
    // windowEnd: January 11, 2025, 02:00.
    // currentDay.endOf('day') evaluates to January 10, 2025, 23:59:59.
    // currentDay.startOf('day') evaluates to January 10, 2025, 00:00.
    // The condition ensures that currentDay is within the window, and slots are generated correctly.
    if (
      currentDay.endOf('day') < windowStart ||
      currentDay.startOf('day') > windowEnd
    ) {
      continue;
    }

    let slotStart = windowStart;

    while (slotStart.plus({ minutes: durationMinutes }) <= windowEnd) {
      const slotEnd = slotStart.plus({ minutes: durationMinutes });
      const slot: TimeSlot = { from: slotStart, to: slotEnd };
      if (
        !isSlotBlocked(slot, bookings) &&
        slotStart.diff(now, 'hours').hours >= mustBookHoursBefore
      ) {
        // const slotDate = slotStart.toFormat(DATE_FORMAT);
        // const slotEndDate = slotEnd.toFormat(DATE_FORMAT);

        // if (slotDate !== slotEndDate) {
        //   // handle availability windows spanning multiple days
        //   slots.push({ from: slotStart, to: slotEnd.startOf('day') });
        // } else {
        // }
        slots.push(slot);
      }
      slotStart = slotEnd;
    }
  }
  return slots;
}

/**
 * Adjusts start and end times of an availability window, handling multi-day spans.
 * @param currentDay - The current date being processed
 * @param availability - The availability window for the day
 * @returns { windowStart: DateTime, windowEnd: DateTime }
 */
function getWindowStartEnd(
  currentDay: DateTime,
  availability: Availability,
  calendarLengthDays: number,
  now: DateTime
): { windowStart: DateTime; windowEnd: DateTime } {
  let windowStart = buildDateTimeFromWeek(currentDay, availability.from);
  let windowEnd = buildDateTimeFromWeek(currentDay, availability.to);

  // Handle windows that span multiple days (e.g., Saturday 22:00 to Sunday 02:00)
  if (windowStart > windowEnd) {
    windowEnd = windowEnd.plus({ days: 1 });
  }

  // Ensure the windowStart is not before now and within calendar length
  // Current Date (now): January 10, 2025, 10:00 AM.
  // Availability Window: January 9, 2025, 22:00 to January 11, 2025, 02:00.
  // calendarLengthDays: 3 days (slots are only valid from January 10–12, 2025).
  // If windowStart is before the start of the current day (January 10, 2025), it is adjusted to January 10, 2025, 00:00
  if (windowStart < now.startOf('day')) {
    windowStart = now.startOf('day'); // Adjust to the current day if the window started earlier
  }

  // Current Date (now): January 10, 2025, 10:00 AM.
  // calendarLengthDays: 3 days (only generate slots for January 10–12, 2025).
  // Availability Window: From January 9, 2025, 22:00 to January 11, 2025, 02:00.
  // Without the added limit, the slots would extend past January 12,
  // violating the calendarLengthDays constraint. For example,
  // slots would be generated for January 11, 2025, 22:00 to January 12, 2025, 02:00.
  const maxEnd = now.plus({ days: calendarLengthDays }).endOf('day');
  if (windowEnd > maxEnd) {
    windowEnd = maxEnd; // Adjust the end time to stay within the calendar length
  }
  return { windowStart, windowEnd };
}
