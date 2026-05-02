import { PrayerName } from './prayer.model';

export type IqamaMode = 'offset' | 'fixed' | 'none';

export type IqamaSetting = {
  mode: IqamaMode;
  offsetMinutes: number | null;
  fixedTime: string | null;
};

export type MasjidSettings = {
  jumuaaPrayers: string[];
  iqama: Record<PrayerName, IqamaSetting>;
};
