import { Component, input } from '@angular/core';
import { EventPopup } from '../../../../core/models/event-popup.model';

@Component({
  selector: 'app-event-popup',
  standalone: true,
  templateUrl: './event-popup.component.html',
})
export class EventPopupComponent {
  readonly popup = input.required<EventPopup>();
}
