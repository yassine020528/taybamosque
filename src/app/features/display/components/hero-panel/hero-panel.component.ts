import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, input, signal } from '@angular/core';
import { MoonPhase } from '../../../../core/models/moon-phase.model';

const JUMUAA_PAGE_SIZE = 3;
const JUMUAA_PAGE_INTERVAL_MS = 10000;
const JUMUAA_ORDER_LABELS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'] as const;

type JumuaaPrayerSlot = {
  time: string;
  orderLabel: string;
};

@Component({
  selector: 'app-hero-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-panel.component.html',
})
export class HeroPanelComponent implements OnDestroy {
  readonly currentTime = input.required<string>();
  readonly gregorianDate = input.required<string>();
  readonly hijriDate = input.required<string>();
  readonly moonPhase = input.required<MoonPhase>();
  readonly jumuaaPrayers = input.required<readonly string[]>();

  readonly activeJumuaaPage = signal(0);
  readonly hasSecondJumuaaPage = computed(() => this.jumuaaPrayers().length > JUMUAA_PAGE_SIZE);
  readonly visibleJumuaaPrayers = computed(() => this.getVisibleJumuaaPrayers());

  private readonly jumuaaPageTimer = window.setInterval(() => this.rotateJumuaaPage(), JUMUAA_PAGE_INTERVAL_MS);

  ngOnDestroy(): void {
    window.clearInterval(this.jumuaaPageTimer);
  }

  private rotateJumuaaPage(): void {
    this.activeJumuaaPage.set(this.hasSecondJumuaaPage() && this.activeJumuaaPage() === 0 ? 1 : 0);
  }

  private getVisibleJumuaaPrayers(): JumuaaPrayerSlot[] {
    const startIndex = this.hasSecondJumuaaPage() ? this.activeJumuaaPage() * JUMUAA_PAGE_SIZE : 0;

    return this.jumuaaPrayers()
      .slice(startIndex, startIndex + JUMUAA_PAGE_SIZE)
      .map((time, index) => {
        const prayerIndex = startIndex + index;

        return {
          time,
          orderLabel: JUMUAA_ORDER_LABELS[prayerIndex] ?? '',
        };
      });
  }
}
