import { Injectable } from '@angular/core';
import { DateParts } from '../models/date-time.model';
import { PrayerEventSummary, PrayerName, PrayerTime } from '../models/prayer.model';
import { secondsFromParts } from '../utils/date-time.util';
import { formatEventCountdown, UNAVAILABLE_MINUTES } from '../utils/time-format.util';

@Injectable({ providedIn: 'root' })
export class PrayerTimelineService {
  getCurrentPrayerName(now: DateParts, prayers: readonly PrayerTime[]): PrayerName | null {
    const currentSeconds = secondsFromParts(now);
    const events = prayers
      .map((prayer) => ({
        prayerName: prayer.name,
        eventSeconds: prayer.adhanMinutes * 60,
      }))
      .filter((event) => Number.isFinite(event.eventSeconds) && event.eventSeconds < UNAVAILABLE_MINUTES)
      .sort((left, right) => left.eventSeconds - right.eventSeconds);

    return events.filter((event) => event.eventSeconds <= currentSeconds).at(-1)?.prayerName ?? events.at(-1)?.prayerName ?? null;
  }

  getNextPrayerEvent(
    now: DateParts,
    prayers: readonly PrayerTime[],
    tomorrowFajr: PrayerTime | null,
  ): PrayerEventSummary {
    const currentSeconds = secondsFromParts(now);
    const events = prayers
      .flatMap((prayer) => [
        {
          prayerName: prayer.name,
          displayName: prayer.name,
          eventLabel: prayer.name === 'Sunrise' ? null : ('Adhan' as const),
          eventSeconds: prayer.adhanMinutes * 60,
        },
        {
          prayerName: prayer.name,
          displayName: prayer.name,
          eventLabel: 'Iqama' as const,
          eventSeconds: prayer.iqamaMinutes * 60,
        },
      ])
      .filter((event) => Number.isFinite(event.eventSeconds) && event.eventSeconds < UNAVAILABLE_MINUTES)
      .sort((left, right) => left.eventSeconds - right.eventSeconds);
    const lastTodayEventSeconds = events.at(-1)?.eventSeconds ?? null;
    const nextEvent = events.find((event) => event.eventSeconds > currentSeconds);

    if (nextEvent) {
      return {
        prayerName: nextEvent.prayerName,
        displayName: nextEvent.displayName,
        eventLabel: nextEvent.eventLabel,
        remainingSeconds: nextEvent.eventSeconds - currentSeconds,
      };
    }

    if (tomorrowFajr && tomorrowFajr.adhanMinutes < UNAVAILABLE_MINUTES && lastTodayEventSeconds !== null) {
      return {
        prayerName: tomorrowFajr.name,
        displayName: `Tomorrow's ${tomorrowFajr.name}`,
        eventLabel: 'Adhan',
        remainingSeconds: tomorrowFajr.adhanMinutes * 60 + 86400 - currentSeconds,
      };
    }

    return {
      prayerName: null,
      displayName: null,
      eventLabel: null,
      remainingSeconds: null,
    };
  }

  formatUpcomingLabel(nextEvent: PrayerEventSummary): string | null {
    if (!nextEvent.displayName || nextEvent.remainingSeconds === null) {
      return null;
    }

    const eventLabelText = nextEvent.eventLabel ? ` ${nextEvent.eventLabel}` : '';
    return `Next: ${nextEvent.displayName}${eventLabelText} in ${formatEventCountdown(nextEvent.remainingSeconds)}`;
  }
}
