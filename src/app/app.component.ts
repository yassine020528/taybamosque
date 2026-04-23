import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type PrayerName = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

type PrayerTime = {
  name: PrayerName;
  arabic: string;
  adhanTime: string;
  adhanMinutes: number;
  iqamaTime: string;
  iqamaMinutes: number;
  isSunrise: boolean;
  isMaghrib: boolean;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
};

type MoonPhase = {
  label: string;
  icon: string;
  imageUrl: string;
};

type DuaaItem = {
  arabic: string;
};

type EventPopupKind = 'adhan' | 'iqama' | 'sunrise';

type EventPopup = {
  key: string;
  kind: EventPopupKind;
  message: string;
  arabicMessage: string;
  imageUrl: string;
};

const TIME_ZONE = 'America/Toronto';
const PRAYER_METHOD = 2;
const PRAYER_SCHOOL = 0;
const MONTREAL_COORDINATES = {
  latitude: 45.5019,
  longitude: -73.5674,
};
const CALENDAR_METHOD = 'MATHEMATICAL';
const ADJUSTMENT = '-1';
const ASTRONOMY_API_APP_ID = import.meta.env['VITE_ASTRONOMY_APP_ID'] ?? '';
const ASTRONOMY_API_APP_SECRET = import.meta.env['VITE_ASTRONOMY_APP_SECRET'] ?? '';
const ASTRONOMY_API_AUTH = import.meta.env['VITE_ASTRONOMY_API_AUTH'] ?? '';
const DISPLAYED_PRAYERS: ReadonlyArray<{ name: PrayerName; arabic: string }> = [
  { name: 'Fajr', arabic: 'الفجر' },
  { name: 'Sunrise', arabic: 'الشروق' },
  { name: 'Dhuhr', arabic: 'الظهر' },
  { name: 'Asr', arabic: 'العصر' },
  { name: 'Maghrib', arabic: 'المغرب' },
  { name: 'Isha', arabic: 'العشاء' },
];
const JUMUAAH_PRAYERS = ['12:30', '13:30', '14:30'] as const;
const IQAMA_CONSTANTS: Record<PrayerName, string | null> = {
  Fajr: null,
  Sunrise: null,
  Dhuhr: '13:30',
  Asr: null,
  Maghrib: null, 
  Isha: null,
};
const IQAMA_OFFSETS_MINUTES: Record<PrayerName, number | null> = {
  Fajr: 25,
  Sunrise: null,
  Dhuhr: 30,
  Asr: 15,
  Maghrib: 7,
  Isha: 15,
};
const ARABIC_PRAYER_NAMES: Record<PrayerName, string> = {
  Fajr: '\u0627\u0644\u0641\u062c\u0631',
  Sunrise: '\u0627\u0644\u0634\u0631\u0648\u0642',
  Dhuhr: '\u0627\u0644\u0638\u0647\u0631',
  Asr: '\u0627\u0644\u0639\u0635\u0631',
  Maghrib: '\u0627\u0644\u0645\u063a\u0631\u0628',
  Isha: '\u0627\u0644\u0639\u0634\u0627\u0621',
};
const DUAAS: ReadonlyArray<DuaaItem> = [
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
    arabic: 'بِسْمِ اللّٰهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَىٰ رَسُوْلِ اللّٰهِ، اَللّٰهُمَّ اغْفِرْ لِيْ ذُنُوْبِيْ، اَللّٰهُمَّ افْتَحْ لِيْ أَبْوَابَ رَحْمَتِكَ',
  },
  {
    arabic: 'أَعُوْذُ بِاللّٰهِ الْعَظِيْمِ، وَبِوَجْهِهِ الْكَرِيْمِ، وَسُلْطَانِهِ الْقَدِيْمِ، مِنَ الشَّيْطَانِ الرَّجِيْمِ',
  },
  {
    arabic: 'بِسْمِ اللّهِ وَالصَّلاَةُ وَالسَّلاَمُ عَلَى رَسُولِ اللّهِ، اَللَّهُـمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْـلِكَ، اَللَّهُـمَّ اعْصِمْنِـي مِنَ الشَّيْـطَانِ الرَّجِـيمِ',
  },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="viewport-shell">
      <div
        class="stage"
        [style.width.px]="scaledStageWidth()"
        [style.height.px]="scaledStageHeight()"
      >
        <div
          class="stage__canvas"
          [style.transform]="'scale(' + stageScale() + ')'"
        >
          <section class="hero">
            <div class="nameplate" aria-label="Masjid Tayba">
              <img src="assets/tayba.png" alt="Masjid Tayba logo" width="100%" height="100%" />
            </div>

            <div class="clock-card">
              <div class="clock-info">
                <p class="clock-label">Current Montreal Time</p>
                <div class="clock-primary">
                  <p class="clock-time">{{ currentTime() }}</p>
                </div>
                <p class="clock-date">{{ gregorianLongDate() }}</p>
                <p class="clock-hijri">{{ hijriLongDate() }}</p>
              </div>
              <div class="moon-phase" [class.with-image]="!!moonPhase().imageUrl">
                  <img *ngIf="moonPhase().imageUrl; else moonIcon" [src]="moonPhase().imageUrl" [alt]="moonPhase().label" />
                  <ng-template #moonIcon>
                    <span class="moon-phase-icon" aria-hidden="true">{{ moonPhase().icon }}</span>
                  </ng-template>
                  <p class="moon-phase-label">Moon Phase</p>
              </div>
            </div>

            <div class="jumuaa-card">
              <p class="clock-label">Jumuah Prayers</p>
              <div class="jumuaa-times">
                <div class="jumuaa-slot" *ngFor="let prayer of formattedJumuaahPrayers(); let index = index">
                  <p class="jumuaa-order">{{ jumuaaOrderLabel(index) }}</p>
                  <p class="jumuaa-time">{{ prayer }}</p>
                </div>
              </div>
            </div>

            <div class="qr-code" aria-label="QR Code">
              <img src="assets/qr.png" alt="QR Code" width="100%" height="100%" />
            </div>
          </section>

          <section class="prayer-card">
            <div class="section-heading">
              <div>
                <h2>Today's Schedule</h2>
              </div>
              <h2 class="h2 upcoming">{{ upcomingPrayerLabel() }}</h2>
            </div>

            <p *ngIf="loadingPrayerTimes()" class="status-message">Loading prayer times...</p>
            <p *ngIf="prayerTimesError()" class="status-message error">{{ prayerTimesError() }}</p>

            <div class="prayer-grid">
              <article
                *ngFor="let prayer of prayerTimes()"
                class="prayer-tile"
                [class.active]="prayer.name === currentPrayerName()"
              >
                <div class="prayer-heading">
                  <div class="prayer-title-with-icon">
                    <div class="prayer-title-copy">
                      <p class="prayer-name">{{ prayerDisplayName(prayer) }}</p>
                      <p class="prayer-arabic">{{ prayerDisplayArabic(prayer) }}</p>
                    </div>
                    <span class="prayer-title-icon" *ngIf="prayer.isSunrise || prayer.isMaghrib" aria-hidden="true">
                      <img *ngIf="prayer.isSunrise" src="/assets/sunrise.png" alt="" class="prayer-icon" />
                      <img *ngIf="prayer.isMaghrib" src="/assets/sunset.png" alt="" class="prayer-icon" />
                    </span>
                  </div>
                </div>
                <div class="sunrise-display" *ngIf="prayer.isSunrise; else prayerSchedule">
                  <p class="prayer-time">{{ prayer.adhanTime }}</p>
                </div>
                <ng-template #prayerSchedule>
                  <div class="prayer-meta">
                    <div class="prayer-row">
                      <p class="prayer-time">{{ prayer.adhanTime }}</p>
                    </div>
                    <div class="prayer-row">
                      <p class="prayer-time">{{ prayer.iqamaTime }}</p>
                    </div>
                  </div>
                </ng-template>
              </article>
            </div>
          </section>
          <section class="duaa-card">
            <div class="duaa-marquee" aria-label="Scrolling duaa list">
              <div class="duaa-track">
                <div class="duaa-group">
                  <p class="duaa-line" *ngFor="let duaa of duaas()">
                    <span class="duaa-text">{{ duaa.arabic }}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <section class="event-popup" *ngIf="activeEventPopup() as popup" aria-live="assertive">
        <div class="event-popup__overlay">
          <div class="event-popup__card">
            <div class="event-popup__icon-wrap">
              <img [src]="popup.imageUrl" alt="" class="event-popup__icon" />
            </div>
            <div class="event-popup__content">
              <p class="event-popup__arabic">{{ popup.arabicMessage }}</p>
              <p class="event-popup__title">{{ popup.message }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      @import url(https://fonts.googleapis.com/earlyaccess/amiri.css);
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
        color: #f7f2e8;
        font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
        --bg-deep: #10231f;
        --bg-mid: #17352f;
        --card: rgba(10, 22, 20, 0.78);
        --card-border: rgba(238, 222, 189, 0.18);
        --accent: #d8b26e;
        --accent-soft: #f0e1bf;
        --muted: rgba(247, 242, 232, 0.72);
      }

      * {
        box-sizing: border-box;
      }

      .viewport-shell {
        display: grid;
        place-items: center;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        background:
          radial-gradient(circle at top, rgba(216, 178, 110, 0.18), transparent 36%),
          linear-gradient(160deg, var(--bg-deep) 0%, var(--bg-mid) 52%, #0b1715 100%);
      }

      .event-popup {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
      }

      .event-popup__overlay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 48px;
        background:
          radial-gradient(circle at 20% 20%, rgba(216, 178, 110, 0.22), transparent 36%),
          radial-gradient(circle at 80% 75%, rgba(255, 255, 255, 0.08), transparent 32%),
          linear-gradient(165deg, #0f2f25 0%, #19563e 52%, #0c2a21 100%);
      }

      .event-popup__card {
        width: min(1200px, 100%);
        min-height: 420px;
        display: grid;
        grid-template-columns: 220px 1fr;
        align-items: center;
        gap: 34px;
        padding: 44px 56px;
        border-radius: 34px;
        border: 1px solid rgba(240, 225, 191, 0.28);
        background: linear-gradient(180deg, rgba(4, 21, 16, 0.6), rgba(4, 21, 16, 0.42));
        box-shadow: 0 30px 70px rgba(0, 0, 0, 0.38);
        backdrop-filter: blur(8px);
      }

      .event-popup__icon-wrap {
        display: grid;
        place-items: center;
      }

      .event-popup__icon {
        width: 180px;
        height: 180px;
        object-fit: contain;
        border-radius: 50%;
        background: rgba(5, 18, 14, 0.65);
        padding: 20px;
        border: 1px solid rgba(240, 225, 191, 0.3);
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
      }

      .event-popup__content {
        display: grid;
        gap: 18px;
        text-align: left;
      }

      .event-popup__arabic {
        font-family: 'Amiri', serif;
        font-size: 72px;
        color: #f0e1bf;
        line-height: 1.15;
      }

      .event-popup__title {
        font-size: 54px;
        color: #ffffff;
        text-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
      }

      @media (max-width: 1100px) {
        .event-popup__card {
          grid-template-columns: 1fr;
          justify-items: center;
          text-align: center;
          gap: 20px;
          min-height: 0;
        }

        .event-popup__content {
          text-align: center;
        }

        .event-popup__arabic {
          font-size: 54px;
        }

        .event-popup__title {
          font-size: 42px;
        }
      }

      .stage {
        position: relative;
        flex: 0 0 auto;
      }

      .stage__canvas {
        position: absolute;
        inset: 0 auto auto 0;
        width: 1920px;
        height: 1080px;
        transform-origin: top left;
      }

      .hero,
      .prayer-card,
      .duaa-card {
        width: 1856px;
        margin: 0 auto;
      }

      .hero {
        display: grid;
        grid-template-columns: 240px 1.65fr 0.88fr 0.88fr;
        gap: 28px;
        align-items: stretch;
        margin-bottom: 28px;
        padding-top: 24px;
      }

      .nameplate {
        display: grid;
        align-content: center;
        gap: 0.2rem;
        min-width: 0;
        min-height: 248px;
      }

      .clock-card,
      .jumuaa-card,
      .prayer-card,
      .qr-code {
        background: var(--card);
        border: 1px solid var(--card-border);
        border-radius: 28px;
        backdrop-filter: blur(12px);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
      }

      .qr-code img {
        border-radius: 28px;
      }



      .section-label,
      .clock-label {
        margin: 0 0 12px;
        color: var(--accent);
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-size: 25px;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h2 {
        font-size: 40px;
      }

      .clock-date,
      .clock-hijri {
        font-size: 30px;
      }

      .clock-date,
      .clock-hijri,
      .status-message {
        color: var(--muted);
      }

      .clock-card,
      .jumuaa-card {
        padding: 34px;
        display: grid;
        align-content: center;
        gap: 14px;
      }

      .clock-card {
        display: grid;
        /* Split into two columns: Left for text, Right for moon */
        grid-template-columns: 1fr auto; 
        align-items: center; /* Vertically centers the moon with the text */
        gap: 24px;
      }
        .clock-info {
          display: flex;
          flex-direction: column;
          gap: 10px; /* Consistent spacing between time and dates */
        }

      .clock-time {
        font-size: 72px;
        color: var(--accent-soft);
        line-height: 1;
      }

      .clock-primary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .moon-phase {
        display: grid;
        justify-items: center;
        gap: 10px;
        min-width: 104px;
        text-align: center;
      }

      .moon-phase img {
        width: 116px;
        height: 116px;
        object-fit: none; /* Prevents the image from stretching */
        object-position: -50px -50px; /* Shifts the image: -Left -Top */
        border-radius: 50%; /* Optional: creates a clean circular crop */
      }

      .moon-phase-icon {
        display: grid;
        place-items: center;
        width: 104px;
        height: 104px;
        border-radius: 50%;
        border: 1px solid rgba(240, 225, 191, 0.14);
        background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.02));
        color: var(--accent-soft);
        font-size: 52px;
      }

      .moon-phase.with-image .moon-phase-label {
        max-width: 104px;
      }

      .moon-phase-label {
        color: var(--muted);
        font-size: 25px;
        line-height: 1.2;
      }

      .jumuaa-times {
        display: grid;
        gap: 14px;
      }

      .jumuaa-slot {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 18px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(240, 225, 191, 0.12);
      }

      .jumuaa-slot:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }

      .jumuaa-order {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 30px;
      }

      .jumuaa-time {
        font-size: 34px;
        color: var(--accent-soft);
      }

      .prayer-card {
        padding: 34px;
        margin-bottom: 24px;
      }

      .duaa-card {
        position: relative;
        display: flex;
        align-items: center;
        padding: 6px 0 0;
        overflow: hidden;
        min-height: 96px;
      }

      .duaa-marquee {
        position: relative;
        width: 100%;
        overflow: hidden;
        mask-image: linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%);
      }

      .duaa-track {
        display: inline-flex;
        align-items: center;
        gap: 48px;
        white-space: nowrap;
        width: max-content;
        animation: duaa-scroll 60s linear infinite;
      }

      .duaa-line {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
      }

      .duaa-line::after {
        content: '•';
        margin-left: 48px;
        color: rgba(216, 178, 110, 0.65);
        font-size: 30px;
      }

      .duaa-text {  
        font-family: 'Amiri', serif;
        font-size: 38px;
        line-height: 2;
        color: var(--accent-soft);
        direction: rtl;
        text-align: center;
      }

      .section-heading {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        align-items: end;
        margin-bottom: 26px;
      }

      .upcoming {
        text-align: right;
      }

      .status-message {
        margin-bottom: 20px;
        font-size: 18px;
      }

      .status-message.error {
        color: #f2b4a5;
      }

      .prayer-grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 18px;
      }

      .prayer-tile {
        padding: 24px 22px;
        border-radius: 22px;
        border: 1px solid rgba(240, 225, 191, 0.1);
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
      }

      .prayer-tile.active {
        background: linear-gradient(180deg, rgba(216, 178, 110, 0.26), rgba(216, 178, 110, 0.12));
        border-color: rgba(216, 178, 110, 0.55);
      }

      .prayer-name {
        font-size: 35px;
      }

      .prayer-heading {
        margin-bottom: 22px;
      }

      .prayer-title-with-icon {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: space-between;
      }

      .prayer-title-copy {
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .prayer-title-icon {
        display: inline-flex;
        width: 60px;
        height: 60px;
        color: var(--accent);
        flex: 0 0 auto;
        margin-left: auto;
      }

      .prayer-icon {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
      }

      .prayer-arabic {
        color: var(--accent-soft);
        font-family: 'Amiri', serif;
        font-size: 30px;
      }

      .prayer-meta {
        display: grid;
        gap: 16px;
      }

      .sunrise-display {
        display: grid;
        align-items: end;
        min-height: 96px;
      }

      .prayer-meta-label {
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 20px;
      }

      .prayer-row {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: baseline;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(240, 225, 191, 0.1);
      }

      .prayer-row:last-child {
        padding-bottom: 0;
        border-bottom: 0;
      }

      .prayer-time {
        font-size: 50px;
        justify-self: end;
        text-align: right;
      }

      @keyframes duaa-scroll {
        from {
          transform: translateX(-50%);
        }

        to {
          transform: translateX(0);
        }
      }
    `,
  ],
})
export class AppComponent {
  private static readonly DESIGN_WIDTH = 1920;
  private static readonly DESIGN_HEIGHT = 1080;

  readonly now = signal(new Date());
  readonly viewportWidth = signal(window.innerWidth);
  readonly viewportHeight = signal(window.innerHeight);
  readonly prayerTimesState = signal<PrayerTime[]>(this.getFallbackPrayerTimes());
  readonly tomorrowFajrState = signal<PrayerTime | null>(null);
  readonly moonPhase = signal<MoonPhase>(this.getMoonPhaseFallback(this.createMontrealIsoDate(this.getDatePartsInZone(new Date()))));
  readonly loadingPrayerTimes = signal(true);
  readonly prayerTimesError = signal('');
  readonly loadedPrayerDate = signal('');
  readonly loadedMoonPhaseDate = signal('');
  readonly hijriDateFromApi = signal<string>('--');
  readonly jumuaaPrayers = signal([...JUMUAAH_PRAYERS]);
  readonly duaas = signal([...DUAAS]);
  readonly scrollingDuaas = computed(() => [...this.duaas(), ...this.duaas()]);
  readonly activeEventPopup = signal<EventPopup | null>(null);

  formatHours(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(2000, 0, 1, hours, minutes);
    return date.toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  readonly formattedJumuaahPrayers = computed(() => this.jumuaaPrayers().map(this.formatHours));


  readonly montrealNow = computed(() => this.getDatePartsInZone(this.now()));
  readonly currentTime = computed(() =>
    this.now().toLocaleTimeString('en-CA', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  );
  readonly gregorianLongDate = computed(() =>
    this.now().toLocaleDateString('en-CA', {
      timeZone: TIME_ZONE,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  );
  readonly hijriLongDate = computed(() => {
    return this.hijriDateFromApi();
  });
  readonly prayerTimes = computed(() => this.prayerTimesState());
  readonly currentPrayerName = computed(() => {
    return this.getCurrentPrayerEvent().prayerName ?? this.prayerTimes().at(-1)?.name ?? this.prayerTimes()[0]?.name ?? '';
  });
  readonly upcomingPrayerLabel = computed(() => {
    const prayers = this.prayerTimes();
    if (this.loadingPrayerTimes()) {
      return 'Updating from AlAdhan...';
    }
    if (!prayers.length) {
      return 'Prayer times unavailable';
    }

    const nextEvent = this.getNextPrayerEvent();
    if (nextEvent.displayName && nextEvent.remainingSeconds !== null) {
      const eventLabelText = nextEvent.eventLabel ? ` ${nextEvent.eventLabel}` : '';
      return `Next: ${nextEvent.displayName}${eventLabelText} in ${this.formatEventCountdown(nextEvent.remainingSeconds)}`;
    }

    const firstPrayer = prayers[0];
    return `Tomorrow starts with ${firstPrayer.name} at ${firstPrayer.adhanTime}`;
  });
  readonly stageScale = computed(() =>
    Math.min(
      this.viewportWidth() / AppComponent.DESIGN_WIDTH,
      this.viewportHeight() / AppComponent.DESIGN_HEIGHT,
    ),
  );
  readonly scaledStageWidth = computed(() => AppComponent.DESIGN_WIDTH * this.stageScale());
  readonly scaledStageHeight = computed(() => AppComponent.DESIGN_HEIGHT * this.stageScale());

  private readonly timer = window.setInterval(() => {
    this.now.set(new Date());
    this.checkAndShowEventPopup();
    void this.refreshPrayerTimesIfNeeded();
    void this.refreshMoonPhaseIfNeeded();
  }, 1000);
  private readonly handleResize = () => {
    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);
  };
  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== 'f' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void this.toggleFullscreen();
  };
  private popupTimerId: number | null = null;
  private lastPopupDateKey = '';
  private lastKnownSecondOfDay: number | null = null;
  private readonly shownPopupKeys = new Set<string>();

  constructor() {
    void this.refreshPrayerTimesIfNeeded();
    void this.refreshMoonPhaseIfNeeded();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy(): void {
    window.clearInterval(this.timer);
    if (this.popupTimerId !== null) {
      window.clearTimeout(this.popupTimerId);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeydown);
  }

  jumuaaOrderLabel(index: number): string {
    return ['First', 'Second', 'Third'][index] ?? `#${index + 1}`;
  }

  prayerDisplayName(prayer: PrayerTime): string {
    return this.isTomorrowFajrPrayer(prayer) ? "Fajr tomorrow" : prayer.name;
  }

  prayerDisplayArabic(prayer: PrayerTime): string {
    return this.isTomorrowFajrPrayer(prayer) ? 'الفجر غدا' : prayer.arabic;
  }

  private getFallbackPrayerTimes(): PrayerTime[] {
    return DISPLAYED_PRAYERS.map((prayer, index) => ({
      name: prayer.name,
      arabic: prayer.arabic,
      adhanTime: '--:--',
      adhanMinutes: Number.MAX_SAFE_INTEGER - index,
      iqamaTime: this.getIqamaTime('--:--', prayer.name),
      iqamaMinutes: Number.MAX_SAFE_INTEGER - index,
      isSunrise: prayer.name === 'Sunrise',
      isMaghrib: prayer.name === 'Maghrib',
    }));
  }

  private async refreshPrayerTimesIfNeeded(): Promise<void> {
    const parts = this.montrealNow();
    const requestDate = this.formatAlAdhanRequestDate(parts);

    if (this.loadedPrayerDate() === requestDate) {
      return;
    }

    this.loadedPrayerDate.set(requestDate);
    this.loadingPrayerTimes.set(true);
    this.prayerTimesError.set('');

    try {
      const tomorrowParts = this.getDatePartsInZone(this.createDateInTimeZone(parts.year, parts.month, parts.day + 1, 12));
      const tomorrowRequestDate = this.formatAlAdhanRequestDate(tomorrowParts);
      const [timings, tomorrowTimings] = await Promise.all([
        this.fetchPrayerTimings(requestDate),
        this.fetchPrayerTimings(tomorrowRequestDate),
      ]);

      this.prayerTimesState.set(this.mapPrayerTimes(timings));
      this.tomorrowFajrState.set(this.mapPrayerTime('Fajr', tomorrowTimings.Fajr ?? '--:--'));

      const hijriDate = await this.fetchHijriDate(requestDate);
      const gregorianDate = this.getDatePartsInZone(this.now());
      const formattedHijri = `${gregorianDate.weekday}, ${hijriDate.day} ${hijriDate.month.en}, ${hijriDate.year}`;
      this.hijriDateFromApi.set(formattedHijri);
    } catch {
      this.prayerTimesError.set('Unable to load live prayer times. Showing placeholders.');
      this.prayerTimesState.set(this.getFallbackPrayerTimes());
      this.tomorrowFajrState.set(null);
    } finally {
      this.loadingPrayerTimes.set(false);
    }
  }

  private checkAndShowEventPopup(): void {
    if (this.loadingPrayerTimes()) {
      return;
    }

    const nowParts = this.montrealNow();
    const dateKey = this.createMontrealIsoDate(nowParts);
    if (this.lastPopupDateKey !== dateKey) {
      this.lastPopupDateKey = dateKey;
      this.shownPopupKeys.clear();
    }

    const currentSecondOfDay = nowParts.hour * 3600 + nowParts.minute * 60 + nowParts.second;
    if (this.lastKnownSecondOfDay === null) {
      this.lastKnownSecondOfDay = currentSecondOfDay;
      return;
    }

    const popupEvent = this.getTriggeredPopupEvent(dateKey, this.lastKnownSecondOfDay, currentSecondOfDay);
    this.lastKnownSecondOfDay = currentSecondOfDay;

    if (!popupEvent || this.shownPopupKeys.has(popupEvent.key)) {
      return;
    }

    this.shownPopupKeys.add(popupEvent.key);
    this.activeEventPopup.set(popupEvent);
    if (this.popupTimerId !== null) {
      window.clearTimeout(this.popupTimerId);
    }
    this.popupTimerId = window.setTimeout(() => {
      this.activeEventPopup.set(null);
    }, 30000);
  }

  private getTriggeredPopupEvent(dateKey: string, previousSecond: number, currentSecond: number): EventPopup | null {
    const events = this.getPopupEventsForToday(dateKey);
    const crossedEvents = events.filter((event) => this.crossedSecond(previousSecond, currentSecond, event.secondOfDay));
    return crossedEvents[0] ?? null;
  }

  private getPopupEventsForToday(dateKey: string): Array<EventPopup & { secondOfDay: number }> {
    return this.prayerTimes()
      .flatMap((prayer) => {
        const events: Array<EventPopup & { secondOfDay: number }> = [];

        if (prayer.adhanMinutes < Number.MAX_SAFE_INTEGER) {
          const isSunrise = prayer.name === 'Sunrise';
          events.push({
            key: `${dateKey}-${prayer.name}-${isSunrise ? 'sunrise' : 'adhan'}`,
            kind: isSunrise ? 'sunrise' : 'adhan',
            message: isSunrise ? "It's time for sunrise" : `It's time for ${prayer.name} Adhan`,
            arabicMessage: this.getArabicPopupMessage(prayer.name, isSunrise ? 'sunrise' : 'adhan'),
            imageUrl: isSunrise ? '/assets/sunrise.png' : '/assets/adhan.png',
            secondOfDay: prayer.adhanMinutes * 60,
          });
        }

        if (prayer.name !== 'Sunrise' && prayer.iqamaMinutes < Number.MAX_SAFE_INTEGER) {
          events.push({
            key: `${dateKey}-${prayer.name}-iqama`,
            kind: 'iqama',
            message: `It's time for ${prayer.name} Iqama`,
            arabicMessage: this.getArabicPopupMessage(prayer.name, 'iqama'),
            imageUrl: '/assets/iqama.png',
            secondOfDay: prayer.iqamaMinutes * 60,
          });
        }

        return events;
      })
      .sort((left, right) => left.secondOfDay - right.secondOfDay);
  }

  private getArabicPopupMessage(prayerName: PrayerName, kind: EventPopupKind): string {
    if (kind === 'sunrise') {
      return '\u062d\u0627\u0646\u064e \u0648\u0642\u062a\u064f \u0627\u0644\u0634\u0631\u0648\u0642';
    }

    const prayerArabic = ARABIC_PRAYER_NAMES[prayerName];
    if (kind === 'adhan') {
      return `\u062d\u0627\u0646\u064e\u0020\u0648\u0642\u062a\u064f\u0020\u0623\u0630\u0627\u0646\u0020\u0635\u0644\u0627\u0629\u0020 ${prayerArabic}`;
    }

    return `\u062d\u0627\u0646\u064e\u0020\u0648\u0642\u062a\u064f\u0020\u0625\u0642\u0627\u0645\u0629\u0020\u0635\u0644\u0627\u0629 ${prayerArabic}`;
  }

  private crossedSecond(previousSecond: number, currentSecond: number, eventSecond: number): boolean {
    if (currentSecond >= previousSecond) {
      return eventSecond > previousSecond && eventSecond <= currentSecond;
    }

    return eventSecond > previousSecond || eventSecond <= currentSecond;
  }

  private async refreshMoonPhaseIfNeeded(): Promise<void> {
    const requestDate = this.createMontrealIsoDate(this.montrealNow());
    if (this.loadedMoonPhaseDate() === requestDate) {
      return;
    }

    this.loadedMoonPhaseDate.set(requestDate);

    const fallback = this.getMoonPhaseFallback(requestDate);
    const authorization = this.getAstronomyAuthorizationHeader();
    if (!authorization) {
      this.moonPhase.set(fallback);
      return;
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
            date: requestDate,
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
      this.moonPhase.set({
        ...fallback,
        imageUrl: payload.data?.imageUrl ?? '',
      });
    } catch {
      this.moonPhase.set(fallback);
    }
  }

  private buildPrayerTimesUrl(date: string): string {
    const params = new URLSearchParams({
      latitude: String(MONTREAL_COORDINATES.latitude),
      longitude: String(MONTREAL_COORDINATES.longitude),
      method: String(PRAYER_METHOD),
      school: String(PRAYER_SCHOOL),
      timezonestring: TIME_ZONE,
      calendarMethod: CALENDAR_METHOD,
      adjustment: ADJUSTMENT,
    });

    return `https://api.aladhan.com/v1/timings/${date}?${params.toString()}`;
  }

  private mapPrayerTimes(timings: Record<string, string>): PrayerTime[] {
    return DISPLAYED_PRAYERS.map((prayer) => this.mapPrayerTime(prayer.name, timings[prayer.name] ?? '--:--'));
  }

  private formatPrayerTime(rawTime: string): string {
    const time = this.extractClockValue(rawTime);
    if (!time) {
      return '--:--';
    }

    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(2000, 0, 1, hours, minutes);
    return date.toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private parsePrayerMinutes(rawTime: string): number {
    const match = rawTime.trim().match(/(\d{1,2}):(\d{2})(?:\s*([ap])\.?\s*m\.?)?/i);
    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toLowerCase();

    if (meridiem === 'p' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'a' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  private getIqamaTime(rawTime: string, prayerName: PrayerName): string {
    let iqamaTime = this.formatHours(IQAMA_CONSTANTS[prayerName] ?? '');
    if (iqamaTime !== '') {
      const offset = IQAMA_OFFSETS_MINUTES[prayerName];
      const adhanMinutes = this.parsePrayerMinutes(rawTime);

      if (offset === null || adhanMinutes === Number.MAX_SAFE_INTEGER) {
        return '--:--';
      }

      iqamaTime = this.formatMinutesAsTime(adhanMinutes + offset);
    }
    return iqamaTime;
  }

  private getNextPrayerEvent(): {
    prayerName: PrayerName | null;
    displayName: string | null;
    eventLabel: 'Adhan' | 'Iqama' | null;
    remainingSeconds: number | null;
  } {
    const current = this.montrealNow();
    const currentSeconds = current.hour * 3600 + current.minute * 60 + current.second;
    const events = this.prayerTimes()
      .flatMap((prayer) => [
        {
          prayerName: prayer.name,
          displayName: prayer.name,
          eventLabel: prayer.name === 'Sunrise' ? null : ('Adhan' as const),
          eventSeconds: prayer.adhanMinutes * 60,
        },
        {
          prayerName: prayer.name,
          displayName: prayer.name,
          eventLabel: 'Iqama' as const,
          eventSeconds: prayer.iqamaMinutes * 60,
        },
      ])
      .filter((event) => Number.isFinite(event.eventSeconds) && event.eventSeconds < Number.MAX_SAFE_INTEGER)
      .sort((left, right) => left.eventSeconds - right.eventSeconds);
    const lastTodayEventSeconds = events.at(-1)?.eventSeconds ?? null;

    const nextEvent = events.find((event) => event.eventSeconds > currentSeconds);
    if (nextEvent) {
      return {
        prayerName: nextEvent.prayerName,
        displayName: nextEvent.displayName,
        eventLabel: nextEvent.eventLabel,
        remainingSeconds: nextEvent.eventSeconds - currentSeconds,
      };
    }

    const tomorrowFajr = this.tomorrowFajrState();
    if (
      tomorrowFajr &&
      tomorrowFajr.adhanMinutes < Number.MAX_SAFE_INTEGER &&
      lastTodayEventSeconds !== null &&
      currentSeconds > lastTodayEventSeconds
    ) {
      const tomorrowFajrSeconds = tomorrowFajr.adhanMinutes * 60 + 86400 - currentSeconds;
      return {
        prayerName: tomorrowFajr.name,
        displayName: `Tomorrow's ${tomorrowFajr.name}`,
        eventLabel: 'Adhan',
        remainingSeconds: tomorrowFajrSeconds,
      };
    }

    return {
      prayerName: null,
      displayName: null,
      eventLabel: null,
      remainingSeconds: null,
    };
  }

  private getCurrentPrayerEvent(): {
    prayerName: PrayerName | null;
    displayName: string | null;
  } {
    const current = this.montrealNow();
    const currentSeconds = current.hour * 3600 + current.minute * 60 + current.second;
    const events = this.prayerTimes()
      .map((prayer) => ({
        prayerName: prayer.name,
        displayName: prayer.name,
        eventSeconds: prayer.adhanMinutes * 60,
      }))
      .filter((event) => Number.isFinite(event.eventSeconds) && event.eventSeconds < Number.MAX_SAFE_INTEGER)
      .sort((left, right) => left.eventSeconds - right.eventSeconds);

    const currentEvent = events.filter((event) => event.eventSeconds <= currentSeconds).at(-1);
    if (currentEvent) {
      return {
        prayerName: currentEvent.prayerName,
        displayName: currentEvent.displayName,
      };
    }

    const lastPrayer = events.at(-1);
    if (lastPrayer) {
      return {
        prayerName: lastPrayer.prayerName,
        displayName: lastPrayer.displayName,
      };
    }

    return {
      prayerName: null,
      displayName: null,
    };
  }

  private async fetchPrayerTimings(date: string): Promise<Record<string, string>> {
    const response = await fetch(this.buildPrayerTimesUrl(date));
    if (!response.ok) {
      throw new Error(`Prayer API returned ${response.status}`);
    }

    const payload = (await response.json()) as { data?: { timings?: Record<string, string> } };
    const timings = payload.data?.timings;
    if (!timings) {
      throw new Error('Prayer API response missing timings');
    }

    return timings;
  }

  private async fetchHijriDate(date: string): Promise<{ day: string; month: { en: string }; year: string }> {
    const response = await fetch(this.buildPrayerTimesUrl(date)); 
    if (!response.ok) {
      throw new Error(`Prayer API returned ${response.status}`);
    }

    const payload = (await response.json()) as { data?: { date?: { hijri?: { day: string; month: { en: string }; year: string } } } };
    const hijriDate = payload.data?.date?.hijri;
    if (!hijriDate) {
      throw new Error('Prayer API response missing hijri date');
    }

    return hijriDate;
  }


  private mapPrayerTime(prayerName: PrayerName, rawTime: string): PrayerTime {
    const prayer = DISPLAYED_PRAYERS.find((item) => item.name === prayerName);
    const iqamaTime = this.getIqamaTime(rawTime, prayerName);

    return {
      name: prayerName,
      arabic: prayer?.arabic ?? '',
      adhanTime: this.formatPrayerTime(rawTime),
      adhanMinutes: this.parsePrayerMinutes(rawTime),
      iqamaTime,
      iqamaMinutes: this.parsePrayerMinutes(iqamaTime),
      isSunrise: prayerName === 'Sunrise',
      isMaghrib: prayerName === 'Maghrib',
    };
  }

  private formatEventCountdown(remainingSeconds: number): string {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  private isTomorrowFajrPrayer(prayer: PrayerTime): boolean {
    const nextEvent = this.getNextPrayerEvent();
    return nextEvent.displayName === "Tomorrow's Fajr" && prayer.name === 'Fajr';
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  private formatMinutesAsTime(totalMinutes: number): string {
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    const date = new Date(2000, 0, 1, hours, minutes);

    return date.toLocaleTimeString('en-CA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private extractClockValue(rawTime: string): string | null {
    const match = rawTime.match(/\d{2}:\d{2}/);
    return match ? match[0] : null;
  }

  private getMoonPhaseFallback(isoDate: string): MoonPhase {
    const phaseAge = this.getMoonAgeInDays(isoDate);

    if (phaseAge < 1.84566) {
      return { label: 'New Moon', icon: '🌑', imageUrl: '' };
    }
    if (phaseAge < 5.53699) {
      return { label: 'Waxing Crescent', icon: '🌒', imageUrl: '' };
    }
    if (phaseAge < 9.22831) {
      return { label: 'First Quarter', icon: '🌓', imageUrl: '' };
    }
    if (phaseAge < 12.91963) {
      return { label: 'Waxing Gibbous', icon: '🌔', imageUrl: '' };
    }
    if (phaseAge < 16.61096) {
      return { label: 'Full Moon', icon: '🌕', imageUrl: '' };
    }
    if (phaseAge < 20.30228) {
      return { label: 'Waning Gibbous', icon: '🌖', imageUrl: '' };
    }
    if (phaseAge < 23.99361) {
      return { label: 'Last Quarter', icon: '🌗', imageUrl: '' };
    }
    if (phaseAge < 27.68493) {
      return { label: 'Waning Crescent', icon: '🌘', imageUrl: '' };
    }

    return { label: 'New Moon', icon: '🌑', imageUrl: '' };
  }

  private getMoonAgeInDays(isoDate: string): number {
    const [year, month, day] = isoDate.split('-').map(Number);
    const date = this.createDateInTimeZone(year, month, day, 12);
    const knownNewMoonUtc = Date.UTC(2000, 0, 6, 18, 14, 0);
    const synodicMonthDays = 29.53058867;
    const age = (date.getTime() - knownNewMoonUtc) / 86400000;

    return ((age % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;
  }

  private getAstronomyAuthorizationHeader(): string {
    if (ASTRONOMY_API_APP_ID && ASTRONOMY_API_APP_SECRET) {
      return `Basic ${btoa(`${ASTRONOMY_API_APP_ID}:${ASTRONOMY_API_APP_SECRET}`)}`;
    }

    if (ASTRONOMY_API_AUTH) {
      return this.formatAstronomyAuthHeader(ASTRONOMY_API_AUTH);
    }

    return '';
  }

  private formatAstronomyAuthHeader(value: string): string {
    return value.startsWith('Basic ') ? value : `Basic ${value}`;
  }

  private getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    const asUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second),
    );

    return (asUtc - date.getTime()) / 60000;
  }

  private getDatePartsInZone(date: Date): DateParts {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
      weekday: String(map.weekday),
    };
  }

  private createMontrealIsoDate(parts: DateParts): string {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }

  private formatAlAdhanRequestDate(parts: DateParts): string {
    return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`;
  }

  private createDateInTimeZone(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offset = this.getTimeZoneOffsetMinutes(utcGuess, TIME_ZONE);
    return new Date(utcGuess.getTime() - offset * 60000);
  }
}
