import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import {
  DEFAULT_MASJID_SETTINGS,
  DISPLAY_DIMENSIONS,
  DISPLAYED_PRAYERS,
  DUAAS,
  MAX_JUMUAAH_PRAYERS,
  TIME_ZONE,
} from './core/config/masjid.config';
import { EventPopup } from './core/models/event-popup.model';
import { IqamaMode, MasjidSettings } from './core/models/masjid-settings.model';
import { MoonPhase } from './core/models/moon-phase.model';
import { PrayerTime } from './core/models/prayer.model';
import { EventPopupService } from './core/services/event-popup.service';
import { MasjidSettingsService } from './core/services/masjid-settings.service';
import { MoonPhaseService } from './core/services/moon-phase.service';
import { PrayerTimeMapper } from './core/services/prayer-time.mapper';
import { PrayerTimelineService } from './core/services/prayer-timeline.service';
import { PrayerTimesService } from './core/services/prayer-times.service';
import { getDatePartsInZone, toAlAdhanRequestDate, toIsoDate } from './core/utils/date-time.util';
import { formatHours } from './core/utils/time-format.util';
import { DuaaMarqueeComponent } from './features/display/components/duaa-marquee/duaa-marquee.component';
import { EventPopupComponent } from './features/display/components/event-popup/event-popup.component';
import { HeroPanelComponent } from './features/display/components/hero-panel/hero-panel.component';
import { PrayerScheduleComponent } from './features/display/components/prayer-schedule/prayer-schedule.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, DuaaMarqueeComponent, EventPopupComponent, HeroPanelComponent, PrayerScheduleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnDestroy {
  private readonly prayerTimesService = inject(PrayerTimesService);
  private readonly prayerTimeMapper = inject(PrayerTimeMapper);
  private readonly moonPhaseService = inject(MoonPhaseService);
  private readonly masjidSettingsService = inject(MasjidSettingsService);
  private readonly prayerTimeline = inject(PrayerTimelineService);
  private readonly eventPopups = inject(EventPopupService);

  private readonly now = signal(new Date());
  private readonly viewportWidth = signal(window.innerWidth);
  private readonly viewportHeight = signal(window.innerHeight);
  private readonly loadedPrayerDate = signal('');
  private readonly loadedMoonPhaseDate = signal('');
  private readonly fullscreenActive = signal(Boolean(document.fullscreenElement));

  readonly prayerTimesState = signal<PrayerTime[]>(this.prayerTimeMapper.getFallbackPrayerTimes());
  readonly tomorrowFajrState = signal<PrayerTime | null>(null);
  readonly moonPhase = signal<MoonPhase>(this.moonPhaseService.getFallbackMoonPhase(toIsoDate(this.montrealNow())));
  readonly loadingPrayerTimes = signal(true);
  readonly prayerTimesError = signal('');
  readonly hijriDateFromApi = signal<string>('--');
  readonly masjidSettings = signal<MasjidSettings>(this.masjidSettingsService.getDefaultSettings());
  readonly jumuaaPrayers = computed(() => this.masjidSettings().jumuaaPrayers);
  readonly duaas = signal([...DUAAS]);
  readonly activeEventPopup = signal<EventPopup | null>(null);
  readonly settingsPanelOpen = signal(false);
  readonly settingsSaving = signal(false);
  readonly settingsStatus = signal('');
  readonly settingsError = signal('');
  readonly editablePrayers = DISPLAYED_PRAYERS.filter((prayer) => prayer.name !== 'Sunrise');
  readonly showSettingsButton = computed(() => !this.fullscreenActive() && !this.settingsPanelOpen());
  readonly maxJumuaaPrayers = MAX_JUMUAAH_PRAYERS;

  readonly formattedJumuaahPrayers = computed(() => this.jumuaaPrayers().map(formatHours));
  readonly prayerTimes = computed(() => this.prayerTimesState());
  readonly currentPrayerName = computed(() => this.prayerTimeline.getCurrentPrayerName(this.montrealNow(), this.prayerTimes()) ?? '');
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
  readonly hijriLongDate = computed(() => this.hijriDateFromApi());
  readonly upcomingPrayerLabel = computed(() => this.getUpcomingPrayerLabel());
  readonly showTomorrowFajrLabel = computed(() => this.isTomorrowFajrUpcoming());
  readonly stageScale = computed(() =>
    Math.min(
      this.viewportWidth() / DISPLAY_DIMENSIONS.width,
      this.viewportHeight() / DISPLAY_DIMENSIONS.height,
    ),
  );
  readonly scaledStageWidth = computed(() => DISPLAY_DIMENSIONS.width * this.stageScale());
  readonly scaledStageHeight = computed(() => DISPLAY_DIMENSIONS.height * this.stageScale());

  private popupTimerId: number | null = null;
  private readonly timer = window.setInterval(() => this.tick(), 1000);
  private readonly handleResize = () => {
    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);
  };
  private readonly handleFullscreenChange = () => {
    this.fullscreenActive.set(Boolean(document.fullscreenElement));
  };
  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === 's' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      this.openSettingsPanel();
      return;
    }

    if (event.key.toLowerCase() !== 'f' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void this.toggleFullscreen();
  };
  settingsDraft: MasjidSettings = this.masjidSettingsService.cloneSettings(DEFAULT_MASJID_SETTINGS);
  adminToken = window.localStorage.getItem('masjid-settings-token') ?? '';

  constructor() {
    void this.loadMasjidSettings();
    void this.refreshPrayerTimesIfNeeded();
    void this.refreshMoonPhaseIfNeeded();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    window.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy(): void {
    window.clearInterval(this.timer);
    this.clearPopupTimer();
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    window.removeEventListener('keydown', this.handleKeydown);
  }

  montrealNow() {
    return getDatePartsInZone(this.now());
  }

  private tick(): void {
    this.now.set(new Date());
    this.showEventPopupIfDue();
    void this.refreshPrayerTimesIfNeeded();
    void this.refreshMoonPhaseIfNeeded();
  }

  private async refreshPrayerTimesIfNeeded(): Promise<void> {
    const parts = this.montrealNow();
    const requestDate = toAlAdhanRequestDate(parts);

    if (this.loadedPrayerDate() === requestDate) {
      return;
    }

    this.loadedPrayerDate.set(requestDate);
    this.loadingPrayerTimes.set(true);
    this.prayerTimesError.set('');

    try {
      const schedule = await this.prayerTimesService.getSchedule(parts, this.masjidSettings());
      this.prayerTimesState.set(schedule.prayers);
      this.tomorrowFajrState.set(schedule.tomorrowFajr);
      this.hijriDateFromApi.set(`${parts.weekday}, ${schedule.hijriDate.day} ${schedule.hijriDate.month.en}, ${schedule.hijriDate.year}`);
    } catch {
      this.prayerTimesError.set('Unable to load live prayer times. Showing placeholders.');
      this.prayerTimesState.set(this.prayerTimeMapper.getFallbackPrayerTimes(this.masjidSettings()));
      this.tomorrowFajrState.set(null);
    } finally {
      this.loadingPrayerTimes.set(false);
    }
  }

  private async refreshMoonPhaseIfNeeded(): Promise<void> {
    const requestDate = toIsoDate(this.montrealNow());

    if (this.loadedMoonPhaseDate() === requestDate) {
      return;
    }

    this.loadedMoonPhaseDate.set(requestDate);
    this.moonPhase.set(await this.moonPhaseService.getMoonPhase(requestDate));
  }

  private showEventPopupIfDue(): void {
    if (this.loadingPrayerTimes()) {
      return;
    }

    const popup = this.eventPopups.getDuePopup(this.montrealNow(), this.prayerTimes());
    if (!popup) {
      return;
    }

    this.activeEventPopup.set(popup);
    this.clearPopupTimer();
    this.popupTimerId = window.setTimeout(() => this.activeEventPopup.set(null), 30000);
  }

  private getUpcomingPrayerLabel(): string {
    const prayers = this.prayerTimes();

    if (this.loadingPrayerTimes()) {
      return 'Updating from AlAdhan...';
    }

    if (!prayers.length) {
      return 'Prayer times unavailable';
    }

    const label = this.prayerTimeline.formatUpcomingLabel(
      this.prayerTimeline.getNextPrayerEvent(this.montrealNow(), prayers, this.tomorrowFajrState()),
    );

    return label ?? `Tomorrow starts with ${prayers[0].name} at ${prayers[0].adhanTime}`;
  }

  private isTomorrowFajrUpcoming(): boolean {
    const nextEvent = this.prayerTimeline.getNextPrayerEvent(this.montrealNow(), this.prayerTimes(), this.tomorrowFajrState());
    return nextEvent.displayName === "Tomorrow's Fajr";
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  private clearPopupTimer(): void {
    if (this.popupTimerId !== null) {
      window.clearTimeout(this.popupTimerId);
      this.popupTimerId = null;
    }
  }

  openSettingsPanel(): void {
    this.settingsDraft = this.masjidSettingsService.cloneSettings(this.masjidSettings());
    this.settingsStatus.set('');
    this.settingsError.set('');
    this.settingsPanelOpen.set(true);
  }

  closeSettingsPanel(): void {
    if (this.settingsSaving()) {
      return;
    }

    this.settingsPanelOpen.set(false);
  }

  addJumuaaPrayer(): void {
    if (this.settingsDraft.jumuaaPrayers.length >= MAX_JUMUAAH_PRAYERS) {
      return;
    }

    this.settingsDraft.jumuaaPrayers = [...this.settingsDraft.jumuaaPrayers, '13:30'];
  }

  removeJumuaaPrayer(index: number): void {
    if (this.settingsDraft.jumuaaPrayers.length <= 1) {
      return;
    }

    this.settingsDraft.jumuaaPrayers = this.settingsDraft.jumuaaPrayers.filter((_, prayerIndex) => prayerIndex !== index);
  }

  updateJumuaaPrayer(index: number, value: string): void {
    this.settingsDraft.jumuaaPrayers = this.settingsDraft.jumuaaPrayers.map((time, prayerIndex) =>
      prayerIndex === index ? value : time,
    );
  }

  setIqamaMode(prayerName: string, mode: IqamaMode): void {
    const prayer = prayerName as keyof MasjidSettings['iqama'];
    const setting = this.settingsDraft.iqama[prayer];
    this.settingsDraft.iqama[prayer] = {
      ...setting,
      mode,
      fixedTime: setting.fixedTime ?? '13:30',
      offsetMinutes: setting.offsetMinutes ?? 15,
    };
  }

  updateIqamaOffset(prayerName: string, value: string): void {
    const prayer = prayerName as keyof MasjidSettings['iqama'];
    this.settingsDraft.iqama[prayer] = {
      ...this.settingsDraft.iqama[prayer],
      offsetMinutes: Number(value),
    };
  }

  updateIqamaFixedTime(prayerName: string, value: string): void {
    const prayer = prayerName as keyof MasjidSettings['iqama'];
    this.settingsDraft.iqama[prayer] = {
      ...this.settingsDraft.iqama[prayer],
      fixedTime: value,
    };
  }

  updateAdminToken(value: string): void {
    this.adminToken = value;
  }

  resetSettingsDraft(): void {
    this.settingsDraft = this.masjidSettingsService.getDefaultSettings();
  }

  async saveSettings(): Promise<void> {
    this.settingsSaving.set(true);
    this.settingsStatus.set('');
    this.settingsError.set('');

    try {
      const savedSettings = await this.masjidSettingsService.saveSettings(this.settingsDraft, this.adminToken.trim());
      window.localStorage.setItem('masjid-settings-token', this.adminToken.trim());
      this.applyMasjidSettings(savedSettings);
      this.settingsStatus.set('Saved. The display is using the new schedule.');
    } catch (error) {
      this.settingsError.set(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      this.settingsSaving.set(false);
    }
  }

  private async loadMasjidSettings(): Promise<void> {
    try {
      this.applyMasjidSettings(await this.masjidSettingsService.getSettings());
    } catch {
      this.applyMasjidSettings(this.masjidSettingsService.getDefaultSettings());
      this.settingsError.set('Settings database is not configured yet. Using built-in defaults.');
    }
  }

  private applyMasjidSettings(settings: MasjidSettings): void {
    this.masjidSettings.set(settings);
    this.loadedPrayerDate.set('');
    void this.refreshPrayerTimesIfNeeded();
  }
}
