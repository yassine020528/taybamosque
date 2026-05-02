const SETTINGS_KEY = 'masjid-display-settings';
const SETTINGS_TABLE = 'masjid_settings';

const DEFAULT_SETTINGS = {
  jumuaaPrayers: ['12:30', '13:30', '14:30'],
  iqama: {
    Fajr: { mode: 'offset', offsetMinutes: 25, fixedTime: null },
    Sunrise: { mode: 'none', offsetMinutes: null, fixedTime: null },
    Dhuhr: { mode: 'fixed', offsetMinutes: 30, fixedTime: '13:30' },
    Asr: { mode: 'offset', offsetMinutes: 15, fixedTime: null },
    Maghrib: { mode: 'offset', offsetMinutes: 7, fixedTime: null },
    Isha: { mode: 'offset', offsetMinutes: 15, fixedTime: null },
  },
};

const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return response(204, '');
  }

  try {
    if (event.httpMethod === 'GET') {
      return response(200, { settings: await readSettings(), configured: hasDatabaseConfig() });
    }

    if (event.httpMethod === 'PUT') {
      authorize(event);
      assertDatabaseConfig();

      const payload = JSON.parse(event.body || '{}');
      const settings = normalizeSettings(payload.settings);
      await saveSettings(settings);

      return response(200, { settings });
    }

    return response(405, { error: 'Method not allowed.' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return response(statusCode, { error: error.message || 'Unexpected settings error.' });
  }
}

async function readSettings() {
  if (!hasDatabaseConfig()) {
    return DEFAULT_SETTINGS;
  }

  const result = await supabaseRequest(
    `${SETTINGS_TABLE}?id=eq.${encodeURIComponent(SETTINGS_KEY)}&select=settings`,
    { method: 'GET' },
  );

  if (!Array.isArray(result) || !result[0]?.settings) {
    return DEFAULT_SETTINGS;
  }

  return normalizeSettings(result[0].settings);
}

async function saveSettings(settings) {
  await supabaseRequest(`${SETTINGS_TABLE}?on_conflict=id`, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      id: SETTINGS_KEY,
      settings,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function supabaseRequest(path, options = {}) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServerKey = getSupabaseServerKey();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: supabaseServerKey,
      Authorization: `Bearer ${supabaseServerKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    const details = await response.text();
    throw withStatus(`Supabase request failed with ${response.status}${details ? `: ${details}` : ''}`, 502);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function authorize(event) {
  const configuredToken = process.env.SETTINGS_ADMIN_TOKEN;
  if (!configuredToken) {
    throw withStatus('SETTINGS_ADMIN_TOKEN is not configured.', 503);
  }

  const providedToken = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '');
  if (providedToken !== configuredToken) {
    throw withStatus('Invalid admin token.', 401);
  }
}

function assertDatabaseConfig() {
  if (!hasDatabaseConfig()) {
    throw withStatus('Missing Supabase server config. Set VITE_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.', 503);
  }
}

function hasDatabaseConfig() {
  return Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && getSupabaseServerKey());
}

function getSupabaseServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

function normalizeSettings(settings = {}) {
  const jumuaaPrayers = Array.isArray(settings.jumuaaPrayers)
    ? settings.jumuaaPrayers.filter(isClockTime)
    : DEFAULT_SETTINGS.jumuaaPrayers;

  return {
    jumuaaPrayers: sortClockTimes(jumuaaPrayers.length ? jumuaaPrayers : DEFAULT_SETTINGS.jumuaaPrayers),
    iqama: Object.fromEntries(
      PRAYERS.map((prayer) => {
        const fallback = DEFAULT_SETTINGS.iqama[prayer];
        const candidate = settings.iqama?.[prayer] || {};
        const mode = ['offset', 'fixed', 'none'].includes(candidate.mode) ? candidate.mode : fallback.mode;

        return [
          prayer,
          {
            mode,
            offsetMinutes: Number.isFinite(candidate.offsetMinutes) ? candidate.offsetMinutes : fallback.offsetMinutes,
            fixedTime: isClockTime(candidate.fixedTime) ? candidate.fixedTime : fallback.fixedTime,
          },
        ];
      }),
    ),
  };
}

function isClockTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function sortClockTimes(times) {
  return [...times].sort((left, right) => clockMinutes(left) - clockMinutes(right));
}

function clockMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function withStatus(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: body === '' ? '' : JSON.stringify(body),
  };
}
