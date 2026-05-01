import { TIME_ZONE } from '../config/masjid.config';
import { DateParts } from '../models/date-time.model';

export const secondsFromParts = (parts: DateParts): number =>
  parts.hour * 3600 + parts.minute * 60 + parts.second;

export function getDatePartsInZone(date: Date, timeZone = TIME_ZONE): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  return {
    year: Number(map['year']),
    month: Number(map['month']),
    day: Number(map['day']),
    hour: Number(map['hour']),
    minute: Number(map['minute']),
    second: Number(map['second']),
    weekday: String(map['weekday']),
  };
}

export const toIsoDate = (parts: DateParts): string =>
  `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

export const toAlAdhanRequestDate = (parts: DateParts): string =>
  `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`;

export function createDateInTimeZone(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone = TIME_ZONE,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offset * 60000);
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(map['year']),
    Number(map['month']) - 1,
    Number(map['day']),
    Number(map['hour']),
    Number(map['minute']),
    Number(map['second']),
  );

  return (asUtc - date.getTime()) / 60000;
}
