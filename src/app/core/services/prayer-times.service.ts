import { inject, Injectable } from '@angular/core';
import { MONTREAL_COORDINATES, PRAYER_API_OPTIONS, TIME_ZONE } from '../config/masjid.config';
import { DateParts } from '../models/date-time.model';
import { MasjidSettings } from '../models/masjid-settings.model';
import { HijriDate, PrayerScheduleSnapshot } from '../models/prayer.model';
import { createDateInTimeZone, getDatePartsInZone, toAlAdhanRequestDate } from '../utils/date-time.util';
import { PrayerTimeMapper } from './prayer-time.mapper';

type AlAdhanDayResponse = {
  timings: Record<string, string>;
  hijriDate: HijriDate;
};

@Injectable({ providedIn: 'root' })
export class PrayerTimesService {
  private readonly mapper = inject(PrayerTimeMapper);

  async getSchedule(parts: DateParts, settings: MasjidSettings): Promise<PrayerScheduleSnapshot> {
    const requestDate = toAlAdhanRequestDate(parts);
    const tomorrow = getDatePartsInZone(createDateInTimeZone(parts.year, parts.month, parts.day + 1, 12));
    const tomorrowRequestDate = toAlAdhanRequestDate(tomorrow);
    const [today, tomorrowDay] = await Promise.all([
      this.fetchPrayerDay(requestDate),
      this.fetchPrayerDay(tomorrowRequestDate),
    ]);

    return {
      prayers: this.mapper.mapPrayerTimes(today.timings, settings),
      tomorrowFajr: this.mapper.mapPrayerTime('Fajr', tomorrowDay.timings['Fajr'] ?? '--:--', settings),
      hijriDate: today.hijriDate,
    };
  }

  private async fetchPrayerDay(date: string): Promise<AlAdhanDayResponse> {
    const response = await fetch(this.buildPrayerTimesUrl(date));
    if (!response.ok) {
      throw new Error(`Prayer API returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: {
        timings?: Record<string, string>;
        date?: { hijri?: HijriDate };
      };
    };
    const timings = payload.data?.timings;
    const hijriDate = payload.data?.date?.hijri;

    if (!timings || !hijriDate) {
      throw new Error('Prayer API response missing schedule data');
    }

    return { timings, hijriDate };
  }

  private buildPrayerTimesUrl(date: string): string {
    const params = new URLSearchParams({
      latitude: String(MONTREAL_COORDINATES.latitude),
      longitude: String(MONTREAL_COORDINATES.longitude),
      method: String(PRAYER_API_OPTIONS.method),
      school: String(PRAYER_API_OPTIONS.school),
      timezonestring: TIME_ZONE,
      calendarMethod: PRAYER_API_OPTIONS.calendarMethod,
      adjustment: PRAYER_API_OPTIONS.adjustment,
    });

    return `https://api.aladhan.com/v1/timings/${date}?${params.toString()}`;
  }
}
