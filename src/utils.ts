import { DateTime, WeekdayNumbers } from 'luxon';
import { TimeInWeek, TimeSlot } from './types';

/**
 * Generate full DateTime for a day and TimeInWeek.
 * @param baseDate: DateTime - The base date
 * @param time: TimeInWeek - The time in week
 * @returns DateTime - The full DateTime for the day and time
 */
export const buildDateTimeFromWeek = (
  baseDate: DateTime,
  time: TimeInWeek
): DateTime => {
  if (time.weekday < 1 || time.weekday > 7) {
    throw new Error(
      `Invalid weekday: ${time.weekday}. Weekday must be between 1 (Monday) and 7 (Sunday).`
    );
  }
  return baseDate.set({
    weekday: time.weekday as WeekdayNumbers,
    hour: time.hour,
    minute: time.minute || 0,
    second: 0,
    millisecond: 0,
  });
};

/**
 * Check if two TimeSlots overlap.
 * @param currentSlot: TimeSlot - The current slot
 * @param bookedSlot: TimeSlot - The booked slot
 * @returns boolean - True if the slots overlap, false otherwise
 */
export const isOverlapping = (
  currentSlot: TimeSlot,
  bookedSlot: TimeSlot
): boolean => {
  return currentSlot.from < bookedSlot.to && bookedSlot.from < currentSlot.to;
};

/**
 * Check if a slot conflicts with existing bookings.
 * @param slot: TimeSlot - The slot to check
 * @param existingBookings - TimeSlot[] - The existing bookings
 * @returns boolean - True if the slot conflicts with existing bookings, false otherwise
 */
export const isSlotBlocked = (
  slot: TimeSlot,
  existingBookings: TimeSlot[]
): boolean => {
  return existingBookings.some((booking) => isOverlapping(slot, booking));
};
