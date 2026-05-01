import { Injectable } from '@angular/core';
import { ASTRONOMY_API_CONFIG, MONTREAL_COORDINATES } from '../config/masjid.config';
import { MoonPhase } from '../models/moon-phase.model';
import { createDateInTimeZone } from '../utils/date-time.util';

@Injectable({ providedIn: 'root' })
export class MoonPhaseService {
  async getMoonPhase(isoDate: string): Promise<MoonPhase> {
    const fallback = this.getFallbackMoonPhase(isoDate);
    const authorization = this.getAuthorizationHeader();

    if (!authorization) {
      return fallback;
    }

    try {
      const response = await fetch('https://api.astronomyapi.com/api/v2/studio/moon-phase', {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'png',
          style: {
            moonStyle: 'default',
            backgroundStyle: 'solid',
            backgroundColor: 'transparent',
            headingColor: '#f0e1bf',
            textColor: '#f7f2e8',
          },
          observer: {
            latitude: MONTREAL_COORDINATES.latitude,
            longitude: MONTREAL_COORDINATES.longitude,
            date: isoDate,
          },
          view: {
            type: 'portrait-simple',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Astronomy API returned ${response.status}`);
      }

      const payload = (await response.json()) as { data?: { imageUrl?: string } };
      return {
        ...fallback,
        imageUrl: payload.data?.imageUrl ?? '',
      };
    } catch {
      return fallback;
    }
  }

  getFallbackMoonPhase(isoDate: string): MoonPhase {
    const phaseAge = this.getMoonAgeInDays(isoDate);

    if (phaseAge < 1.84566) return { label: 'New Moon', icon: '🌑', imageUrl: '' };
    if (phaseAge < 5.53699) return { label: 'Waxing Crescent', icon: '🌒', imageUrl: '' };
    if (phaseAge < 9.22831) return { label: 'First Quarter', icon: '🌓', imageUrl: '' };
    if (phaseAge < 12.91963) return { label: 'Waxing Gibbous', icon: '🌔', imageUrl: '' };
    if (phaseAge < 16.61096) return { label: 'Full Moon', icon: '🌕', imageUrl: '' };
    if (phaseAge < 20.30228) return { label: 'Waning Gibbous', icon: '🌖', imageUrl: '' };
    if (phaseAge < 23.99361) return { label: 'Last Quarter', icon: '🌗', imageUrl: '' };
    if (phaseAge < 27.68493) return { label: 'Waning Crescent', icon: '🌘', imageUrl: '' };

    return { label: 'New Moon', icon: '🌑', imageUrl: '' };
  }

  private getMoonAgeInDays(isoDate: string): number {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = createDateInTimeZone(year, month, day, 12);
    const knownNewMoonUtc = Date.UTC(2000, 0, 6, 18, 14, 0);
    const synodicMonthDays = 29.53058867;
    const age = (date.getTime() - knownNewMoonUtc) / 86400000;

    return ((age % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;
  }

  private getAuthorizationHeader(): string {
    if (ASTRONOMY_API_CONFIG.appId && ASTRONOMY_API_CONFIG.appSecret) {
      return `Basic ${btoa(`${ASTRONOMY_API_CONFIG.appId}:${ASTRONOMY_API_CONFIG.appSecret}`)}`;
    }

    if (ASTRONOMY_API_CONFIG.auth) {
      return ASTRONOMY_API_CONFIG.auth.startsWith('Basic ')
        ? ASTRONOMY_API_CONFIG.auth
        : `Basic ${ASTRONOMY_API_CONFIG.auth}`;
    }

    return '';
  }
}
