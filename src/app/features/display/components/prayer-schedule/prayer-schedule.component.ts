import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { PrayerName, PrayerTime } from '../../../../core/models/prayer.model';

@Component({
  selector: 'app-prayer-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prayer-schedule.component.html',
})
export class PrayerScheduleComponent {
  readonly prayers = input.required<readonly PrayerTime[]>();
  readonly currentPrayerName = input.required<PrayerName | ''>();
  readonly upcomingPrayerLabel = input.required<string>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string>();
  readonly showTomorrowFajrLabel = input.required<boolean>();

  prayerDisplayName(prayer: PrayerTime): string {
    return this.isTomorrowFajrPrayer(prayer) ? 'Fajr tomorrow' : prayer.name;
  }

  prayerDisplayArabic(prayer: PrayerTime): string {
    return this.isTomorrowFajrPrayer(prayer) ? 'الفجر غدا' : prayer.arabic;
  }

  private isTomorrowFajrPrayer(prayer: PrayerTime): boolean {
    return this.showTomorrowFajrLabel() && prayer.name === 'Fajr';
  }
}
