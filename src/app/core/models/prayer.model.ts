export type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export type PrayerDefinition = {
  name: PrayerName;
  arabic: string;
};

export type PrayerTime = PrayerDefinition & {
  adhanTime: string;
  adhanMinutes: number;
  iqamaTime: string;
  iqamaMinutes: number;
  isSunrise: boolean;
  isMaghrib: boolean;
};

export type PrayerEventLabel = 'Adhan' | 'Iqama';

export type PrayerEventSummary = {
  prayerName: PrayerName | null;
  displayName: string | null;
  eventLabel: PrayerEventLabel | null;
  remainingSeconds: number | null;
};

export type HijriDate = {
  day: string;
  month: { en: string };
  year: string;
};

export type PrayerScheduleSnapshot = {
  prayers: PrayerTime[];
  tomorrowFajr: PrayerTime | null;
  hijriDate: HijriDate;
};
