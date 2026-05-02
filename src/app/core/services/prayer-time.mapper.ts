import { Injectable } from '@angular/core';
import { DEFAULT_MASJID_SETTINGS, DISPLAYED_PRAYERS } from '../config/masjid.config';
import { MasjidSettings } from '../models/masjid-settings.model';
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
  mapPrayerTimes(timings: Record<string, string>, settings: MasjidSettings = DEFAULT_MASJID_SETTINGS): PrayerTime[] {
    return DISPLAYED_PRAYERS.map((prayer) => this.mapPrayerTime(prayer.name, timings[prayer.name] ?? MISSING_TIME, settings));
  }

  mapPrayerTime(prayerName: PrayerName, rawTime: string, settings: MasjidSettings = DEFAULT_MASJID_SETTINGS): PrayerTime {
    const prayer = DISPLAYED_PRAYERS.find((item) => item.name === prayerName);
    const iqamaTime = this.getIqamaTime(rawTime, prayerName, settings);

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

  getFallbackPrayerTimes(settings: MasjidSettings = DEFAULT_MASJID_SETTINGS): PrayerTime[] {
    return DISPLAYED_PRAYERS.map((prayer, index) => ({
      name: prayer.name,
      arabic: prayer.arabic,
      adhanTime: MISSING_TIME,
      adhanMinutes: UNAVAILABLE_MINUTES - index,
      iqamaTime: this.getIqamaTime(MISSING_TIME, prayer.name, settings),
      iqamaMinutes: UNAVAILABLE_MINUTES - index,
      isSunrise: prayer.name === 'Sunrise',
      isMaghrib: prayer.name === 'Maghrib',
    }));
  }

  private getIqamaTime(rawTime: string, prayerName: PrayerName, settings: MasjidSettings): string {
    const iqamaSetting = settings.iqama[prayerName];

    if (iqamaSetting.mode === 'none') {
      return MISSING_TIME;
    }

    if (iqamaSetting.mode === 'fixed' && iqamaSetting.fixedTime) {
      const fixedIqamaTime = formatHours(iqamaSetting.fixedTime);
      return fixedIqamaTime;
    }

    const offset = iqamaSetting.offsetMinutes;
    const adhanMinutes = parseClockMinutes(rawTime);

    if (offset === null || adhanMinutes === UNAVAILABLE_MINUTES) {
      return MISSING_TIME;
    }

    return formatMinutesAsTime(adhanMinutes + offset);
  }
}
