create table if not exists public.masjid_settings (
  id text primary key,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.masjid_settings enable row level security;

insert into public.masjid_settings (id, settings)
values (
  'masjid-display-settings',
  '{
    "jumuaaPrayers": ["12:30", "13:30", "14:30"],
    "iqama": {
      "Fajr": { "mode": "offset", "offsetMinutes": 25, "fixedTime": null },
      "Sunrise": { "mode": "none", "offsetMinutes": null, "fixedTime": null },
      "Dhuhr": { "mode": "fixed", "offsetMinutes": 30, "fixedTime": "13:30" },
      "Asr": { "mode": "offset", "offsetMinutes": 15, "fixedTime": null },
      "Maghrib": { "mode": "offset", "offsetMinutes": 7, "fixedTime": null },
      "Isha": { "mode": "offset", "offsetMinutes": 15, "fixedTime": null }
    }
  }'::jsonb
)
on conflict (id) do nothing;
