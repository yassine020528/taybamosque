import { Injectable } from '@angular/core';
import { DISPLAYED_PRAYERS, IQAMA_CONSTANTS, IQAMA_OFFSETS_MINUTES } from '../config/masjid.config';
import { PrayerName, PrayerTime } from '../models/prayer.model';
import {
  formatHours,
  formatMinutesAsTime,
  formatPrayerTime,
  MISSING_TIME,
  parseClockMinutes,
  UNAVAILABLE_MINUTES,
} from '../utils/time-format.util';

@Injectable({ providedIn: 'root' })
export class PrayerTimeMapper {
  mapPrayerTimes(timings: Record<string, string>): PrayerTime[] {
    return DISPLAYED_PRAYERS.map((prayer) => this.mapPrayerTime(prayer.name, timings[prayer.name] ?? MISSING_TIME));
  }

  mapPrayerTime(prayerName: PrayerName, rawTime: string): PrayerTime {
    const prayer = DISPLAYED_PRAYERS.find((item) => item.name === prayerName);
    const iqamaTime = this.getIqamaTime(rawTime, prayerName);

    return {
      name: prayerName,
      arabic: prayer?.arabic ?? '',
      adhanTime: formatPrayerTime(rawTime),
      adhanMinutes: parseClockMinutes(rawTime),
      iqamaTime,
      iqamaMinutes: parseClockMinutes(iqamaTime),
      isSunrise: prayerName === 'Sunrise',
      isMaghrib: prayerName === 'Maghrib',
    };
  }

  getFallbackPrayerTimes(): PrayerTime[] {
    return DISPLAYED_PRAYERS.map((prayer, index) => ({
      name: prayer.name,
      arabic: prayer.arabic,
      adhanTime: MISSING_TIME,
      adhanMinutes: UNAVAILABLE_MINUTES - index,
      iqamaTime: this.getIqamaTime(MISSING_TIME, prayer.name),
      iqamaMinutes: UNAVAILABLE_MINUTES - index,
      isSunrise: prayer.name === 'Sunrise',
      isMaghrib: prayer.name === 'Maghrib',
    }));
  }

  private getIqamaTime(rawTime: string, prayerName: PrayerName): string {
    const fixedIqamaTime = IQAMA_CONSTANTS[prayerName] ? formatHours(IQAMA_CONSTANTS[prayerName] ?? '') : '';
    if (fixedIqamaTime) {
      return fixedIqamaTime;
    }

    const offset = IQAMA_OFFSETS_MINUTES[prayerName];
    const adhanMinutes = parseClockMinutes(rawTime);

    if (offset === null || adhanMinutes === UNAVAILABLE_MINUTES) {
      return MISSING_TIME;
    }

    return formatMinutesAsTime(adhanMinutes + offset);
  }
}
