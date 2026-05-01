import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { DuaaItem } from '../../../../core/models/content.model';

@Component({
  selector: 'app-duaa-marquee',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './duaa-marquee.component.html',
})
export class DuaaMarqueeComponent {
  readonly duaas = input.required<readonly DuaaItem[]>();
}
