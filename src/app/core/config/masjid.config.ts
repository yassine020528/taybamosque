import { DuaaItem } from '../models/content.model';
import { PrayerDefinition, PrayerName } from '../models/prayer.model';

export const DISPLAY_DIMENSIONS = {
  width: 1920,
  height: 1080,
} as const;

export const TIME_ZONE = 'America/Toronto';

export const MONTREAL_COORDINATES = {
  latitude: 45.5019,
  longitude: -73.5674,
} as const;

export const PRAYER_API_OPTIONS = {
  method: 2,
  school: 0,
  calendarMethod: 'MATHEMATICAL',
  adjustment: '0',
} as const;

export const ASTRONOMY_API_CONFIG = {
  appId: import.meta.env['VITE_ASTRONOMY_APP_ID'] ?? '',
  appSecret: import.meta.env['VITE_ASTRONOMY_APP_SECRET'] ?? '',
  auth: import.meta.env['VITE_ASTRONOMY_API_AUTH'] ?? '',
} as const;

export const DISPLAYED_PRAYERS: readonly PrayerDefinition[] = [
  { name: 'Fajr', arabic: 'الفجر' },
  { name: 'Sunrise', arabic: 'الشروق' },
  { name: 'Dhuhr', arabic: 'الظهر' },
  { name: 'Asr', arabic: 'العصر' },
  { name: 'Maghrib', arabic: 'المغرب' },
  { name: 'Isha', arabic: 'العشاء' },
];

export const JUMUAAH_PRAYERS = ['12:30', '13:30', '14:30'] as const;

export const IQAMA_CONSTANTS: Record<PrayerName, string | null> = {
  Fajr: null,
  Sunrise: null,
  Dhuhr: '13:30',
  Asr: null,
  Maghrib: null,
  Isha: null,
};

export const IQAMA_OFFSETS_MINUTES: Record<PrayerName, number | null> = {
  Fajr: 25,
  Sunrise: null,
  Dhuhr: 30,
  Asr: 15,
  Maghrib: 7,
  Isha: 15,
};

export const ARABIC_PRAYER_NAMES: Record<PrayerName, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

export const DUAAS: readonly DuaaItem[] = [
  {
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
  },
  {
    arabic: 'اللَّهُمَّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
  },
  {
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
  },
  {
    arabic:
      'بِسْمِ اللّٰهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَىٰ رَسُوْلِ اللّٰهِ، اَللّٰهُمَّ اغْفِرْ لِيْ ذُنُوْبِيْ، اَللّٰهُمَّ افْتَحْ لِيْ أَبْوَابَ رَحْمَتِكَ',
  },
  {
    arabic:
      'أَعُوْذُ بِاللّٰهِ الْعَظِيْمِ، وَبِوَجْهِهِ الْكَرِيْمِ، وَسُلْطَانِهِ الْقَدِيْمِ، مِنَ الشَّيْطَانِ الرَّجِيْمِ',
  },
  {
    arabic:
      'بِسْمِ اللّهِ وَالصَّلاَةُ وَالسَّلاَمُ عَلَى رَسُولِ اللّهِ، اَللَّهُـمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْـلِكَ، اَللَّهُـمَّ اعْصِمْنِـي مِنَ الشَّيْـطَانِ الرَّجِـيمِ',
  },
];
