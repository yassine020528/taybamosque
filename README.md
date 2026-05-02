# Masjid Prayer Display

A full-screen masjid display for daily prayer times, iqama times, Jumuaa times, Hijri date, moon phase, event popups, and a scrolling duaa marquee.

The app is built with Angular and Vite. Prayer times are fetched from AlAdhan, moon phase data can use the Astronomy API, and editable masjid settings are persisted in Supabase through a Netlify Function.

## Features

- Full-screen 1920x1080 prayer display that scales to the browser window
- Live Montreal prayer schedule from AlAdhan
- Iqama times based on editable fixed times or adhan offsets
- Editable Jumuaa prayer count and times
- Persistent settings stored in Supabase
- Protected settings editor using an admin token
- Hijri date from prayer API response
- Moon phase panel
- Adhan/iqama event popups
- Duaa marquee
- Keyboard fullscreen toggle with `f`

## Tech Stack

- Angular 21
- Vite
- TypeScript
- Netlify Functions
- Supabase Postgres

## Project Structure

```text
src/app/
  app.component.*                         Main display shell and settings editor
  core/config/masjid.config.ts            Default display/settings config
  core/models/                            Shared TypeScript models
  core/services/                          Prayer, settings, timeline, moon, and popup services
  features/display/components/            Display-only UI components

netlify/functions/masjid-settings.js      Serverless settings API
supabase-setup.sql                        Supabase table setup script
netlify.toml                              Netlify build/function configuration
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root. Example:

```text
VITE_ASTRONOMY_APP_ID=your_astronomy_app_id
VITE_ASTRONOMY_APP_SECRET=your_astronomy_app_secret
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key
SETTINGS_ADMIN_TOKEN=choose_a_long_admin_password
```

Important: do not prefix `SUPABASE_SERVICE_ROLE_KEY` with `VITE_`. Vite variables are exposed to the browser, while the service role key must stay server-side.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the contents of [supabase-setup.sql](./supabase-setup.sql).
4. Add the Supabase values to your local `.env` and to your Netlify environment variables.

The setup script creates one table:

```text
public.masjid_settings
```

The app stores one row:

```text
id: masjid-display-settings
```

The row contains the editable Jumuaa and iqama settings as JSON.

## Development

For frontend-only development:

```bash
npm run dev
```

For the settings editor and Supabase persistence, use Netlify Dev so the serverless function is available locally:

```bash
npm run dev:netlify
```

If `netlify` is not recognized, install the Netlify CLI:

```bash
npm install -g netlify-cli
```

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

This project is configured for Netlify.

Netlify uses:

```text
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
```

Required Netlify environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SETTINGS_ADMIN_TOKEN
```

Optional Astronomy API variables:

```text
VITE_ASTRONOMY_APP_ID
VITE_ASTRONOMY_APP_SECRET
VITE_ASTRONOMY_API_AUTH
```

## Editing Prayer Settings

Open the deployed site, then click **Settings**.

You can edit:

- Number of Jumuaa prayers
- Jumuaa prayer times
- Iqama mode per prayer:
  - offset after adhan
  - fixed time
  - no iqama

When saving, enter the same value configured as `SETTINGS_ADMIN_TOKEN`.

Jumuaa times are automatically sorted before they are saved to Supabase.

The settings button is hidden in fullscreen mode.

## Runtime Behavior

- Public visitors can view the display.
- Saving settings requires the admin token.
- The browser never receives the Supabase service role key.
- If Supabase is not configured, the app falls back to defaults from `masjid.config.ts`.
- If the settings API returns `404` locally, run with `npm run dev:netlify` instead of `npm run dev`.

## Useful Files

- [src/app/core/config/masjid.config.ts](./src/app/core/config/masjid.config.ts): default prayer and display configuration
- [src/app/core/services/masjid-settings.service.ts](./src/app/core/services/masjid-settings.service.ts): frontend settings API client and validation
- [netlify/functions/masjid-settings.js](./netlify/functions/masjid-settings.js): protected backend API for Supabase persistence
- [supabase-setup.sql](./supabase-setup.sql): database setup script

