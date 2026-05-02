import { Injectable } from '@angular/core';
import { DEFAULT_MASJID_SETTINGS, DISPLAYED_PRAYERS, MAX_JUMUAAH_PRAYERS } from '../config/masjid.config';
import { MasjidSettings } from '../models/masjid-settings.model';
import { PrayerName } from '../models/prayer.model';

type SettingsApiResponse = {
  settings?: Partial<MasjidSettings>;
};

@Injectable({ providedIn: 'root' })
export class MasjidSettingsService {
  private readonly endpoint = '/.netlify/functions/masjid-settings';

  async getSettings(): Promise<MasjidSettings> {
    const response = await fetch(this.endpoint, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Settings API returned ${response.status}`);
    }

    const payload = (await response.json()) as SettingsApiResponse;
    return this.normalizeSettings(payload.settings);
  }

  async saveSettings(settings: MasjidSettings, adminToken: string): Promise<MasjidSettings> {
    const response = await fetch(this.endpoint, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ settings: this.normalizeSettings(settings) }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Settings API was not found. Run the app with Netlify Dev locally, or deploy it to Netlify.');
      }

      const message = await this.readErrorMessage(response);
      throw new Error(message || `Settings API returned ${response.status}`);
    }

    const payload = (await response.json()) as SettingsApiResponse;
    return this.normalizeSettings(payload.settings);
  }

  getDefaultSettings(): MasjidSettings {
    return this.cloneSettings(DEFAULT_MASJID_SETTINGS);
  }

  cloneSettings(settings: MasjidSettings): MasjidSettings {
    return {
      jumuaaPrayers: [...settings.jumuaaPrayers],
      iqama: Object.fromEntries(
        DISPLAYED_PRAYERS.map((prayer) => {
          const setting = settings.iqama[prayer.name];
          return [prayer.name, { ...setting }];
        }),
      ) as Record<PrayerName, MasjidSettings['iqama'][PrayerName]>,
    };
  }

  normalizeSettings(settings: Partial<MasjidSettings> | null | undefined): MasjidSettings {
    const fallback = DEFAULT_MASJID_SETTINGS;
    const jumuaaPrayers = Array.isArray(settings?.jumuaaPrayers)
      ? settings.jumuaaPrayers.filter((time): time is string => this.isClockTime(time))
      : fallback.jumuaaPrayers;

    return {
      jumuaaPrayers: this.sortClockTimes(jumuaaPrayers.length ? jumuaaPrayers : [...fallback.jumuaaPrayers])
        .slice(0, MAX_JUMUAAH_PRAYERS),
      iqama: Object.fromEntries(
        DISPLAYED_PRAYERS.map((prayer) => {
          const candidate = settings?.iqama?.[prayer.name];
          const fallbackSetting = fallback.iqama[prayer.name];
          const mode = candidate?.mode === 'fixed' || candidate?.mode === 'offset' || candidate?.mode === 'none'
            ? candidate.mode
            : fallbackSetting.mode;

          return [
            prayer.name,
            {
              mode,
              offsetMinutes: Number.isFinite(candidate?.offsetMinutes)
                ? Number(candidate?.offsetMinutes)
                : fallbackSetting.offsetMinutes,
              fixedTime: candidate?.fixedTime && this.isClockTime(candidate.fixedTime)
                ? candidate.fixedTime
                : fallbackSetting.fixedTime,
            },
          ];
        }),
      ) as Record<PrayerName, MasjidSettings['iqama'][PrayerName]>,
    };
  }

  private isClockTime(value: unknown): value is string {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  private sortClockTimes(times: string[]): string[] {
    return [...times].sort((left, right) => this.clockMinutes(left) - this.clockMinutes(right));
  }

  private clockMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error ?? '';
    } catch {
      return '';
    }
  }
}
