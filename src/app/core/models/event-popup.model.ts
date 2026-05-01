export type EventPopupKind = 'adhan' | 'iqama' | 'sunrise';

export type EventPopup = {
  key: string;
  kind: EventPopupKind;
  message: string;
  arabicMessage: string;
  imageUrl: string;
};

export type TimedEventPopup = EventPopup & {
  secondOfDay: number;
};
