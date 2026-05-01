export const MISSING_TIME = '--:--';
export const UNAVAILABLE_MINUTES = Number.MAX_SAFE_INTEGER;

export function formatHours(time: string): string {
  if (!time) {
    return MISSING_TIME;
  }

  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  return date.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatPrayerTime(rawTime: string): string {
  const time = extractClockValue(rawTime);
  return time ? formatHours(time) : MISSING_TIME;
}

export function parseClockMinutes(rawTime: string): number {
  const match = rawTime.trim().match(/(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?/i);
  if (!match) {
    return UNAVAILABLE_MINUTES;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'p' && hours < 12) {
    hours += 12;
  } else if (meridiem === 'a' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return formatHours(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
}

export function formatEventCountdown(remainingSeconds: number): string {
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function extractClockValue(rawTime: string): string | null {
  const match = rawTime.match(/\d{2}:\d{2}/);
  return match ? match[0] : null;
}
