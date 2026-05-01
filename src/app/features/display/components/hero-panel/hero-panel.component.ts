import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MoonPhase } from '../../../../core/models/moon-phase.model';

@Component({
  selector: 'app-hero-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-panel.component.html',
})
export class HeroPanelComponent {
  readonly currentTime = input.required<string>();
  readonly gregorianDate = input.required<string>();
  readonly hijriDate = input.required<string>();
  readonly moonPhase = input.required<MoonPhase>();
  readonly jumuaaPrayers = input.required<readonly string[]>();

  jumuaaOrderLabel(index: number): string {
    return ['First', 'Second', 'Third'][index] ?? `#${index + 1}`;
  }
}
