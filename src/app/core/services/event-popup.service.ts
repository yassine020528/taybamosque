import { Injectable } from '@angular/core';
import { ARABIC_PRAYER_NAMES } from '../config/masjid.config';
import { DateParts } from '../models/date-time.model';
import { EventPopup, EventPopupKind, TimedEventPopup } from '../models/event-popup.model';
import { PrayerName, PrayerTime } from '../models/prayer.model';
import { secondsFromParts, toIsoDate } from '../utils/date-time.util';
import { UNAVAILABLE_MINUTES } from '../utils/time-format.util';

@Injectable({ providedIn: 'root' })
export class EventPopupService {
  private lastDateKey = '';
  private lastKnownSecondOfDay: number | null = null;
  private readonly shownPopupKeys = new Set<string>();

  getDuePopup(now: DateParts, prayers: readonly PrayerTime[]): EventPopup | null {
    const dateKey = toIsoDate(now);
    if (this.lastDateKey !== dateKey) {
      this.lastDateKey = dateKey;
      this.shownPopupKeys.clear();
    }

    const currentSecondOfDay = secondsFromParts(now);
    if (this.lastKnownSecondOfDay === null) {
      this.lastKnownSecondOfDay = currentSecondOfDay;
      return null;
    }

    const popup = this.getTriggeredPopup(dateKey, this.lastKnownSecondOfDay, currentSecondOfDay, prayers);
    this.lastKnownSecondOfDay = currentSecondOfDay;

    if (!popup || this.shownPopupKeys.has(popup.key)) {
      return null;
    }

    this.shownPopupKeys.add(popup.key);
    return popup;
  }

  private getTriggeredPopup(
    dateKey: string,
    previousSecond: number,
    currentSecond: number,
    prayers: readonly PrayerTime[],
  ): EventPopup | null {
    const events = this.getEventsForDay(dateKey, prayers);
    return events.find((event) => this.crossedSecond(previousSecond, currentSecond, event.secondOfDay)) ?? null;
  }

  private getEventsForDay(dateKey: string, prayers: readonly PrayerTime[]): TimedEventPopup[] {
    return prayers
      .flatMap((prayer) => this.getPrayerEvents(dateKey, prayer))
      .sort((left, right) => left.secondOfDay - right.secondOfDay);
  }

  private getPrayerEvents(dateKey: string, prayer: PrayerTime): TimedEventPopup[] {
    const events: TimedEventPopup[] = [];

    if (prayer.adhanMinutes < UNAVAILABLE_MINUTES) {
      const isSunrise = prayer.name === 'Sunrise';
      events.push({
        key: `${dateKey}-${prayer.name}-${isSunrise ? 'sunrise' : 'adhan'}`,
        kind: isSunrise ? 'sunrise' : 'adhan',
        message: isSunrise ? "It's time for sunrise" : `It's time for ${prayer.name} Adhan`,
        arabicMessage: this.getArabicPopupMessage(prayer.name, isSunrise ? 'sunrise' : 'adhan'),
        imageUrl: isSunrise ? '/assets/sunrise.png' : '/assets/adhan.png',
        secondOfDay: prayer.adhanMinutes * 60,
      });
    }

    if (prayer.name !== 'Sunrise' && prayer.iqamaMinutes < UNAVAILABLE_MINUTES) {
      events.push({
        key: `${dateKey}-${prayer.name}-iqama`,
        kind: 'iqama',
        message: `It's time for ${prayer.name} Iqama`,
        arabicMessage: this.getArabicPopupMessage(prayer.name, 'iqama'),
        imageUrl: '/assets/iqama.png',
        secondOfDay: prayer.iqamaMinutes * 60,
      });
    }

    return events;
  }

  private getArabicPopupMessage(prayerName: PrayerName, kind: EventPopupKind): string {
    if (kind === 'sunrise') {
      return 'حانَ وقتُ الشروق';
    }

    const prayerArabic = ARABIC_PRAYER_NAMES[prayerName];
    return kind === 'adhan'
      ? `حانَ وقتُ أذان صلاة ${prayerArabic}`
      : `حانَ وقتُ إقامة صلاة ${prayerArabic}`;
  }

  private crossedSecond(previousSecond: number, currentSecond: number, eventSecond: number): boolean {
    if (currentSecond >= previousSecond) {
      return eventSecond > previousSecond && eventSecond <= currentSecond;
    }

    return eventSecond > previousSecond || eventSecond <= currentSecond;
  }
}
