'use strict';
// Supabase sync — device-UUID-based, no auth
// TODO: Replace device-UUID approach with OAuth (Google/magic link) for production
// Configure Supabase URL + anon key in the FormAssist options page.

let _sbConfig   = null;
let _sbDeviceId = null;

async function sbGetConfig() {
  if (_sbConfig) return _sbConfig;
  return new Promise(resolve => {
    chrome.storage.sync.get(['faSupabaseUrl', 'faSupabaseKey'], stored => {
      const url = (stored.faSupabaseUrl || '').trim();
      const key = (stored.faSupabaseKey || '').trim();
      _sbConfig = (url && key) ? { url, key } : null;
      resolve(_sbConfig);
    });
  });
}

async function sbGetDeviceId() {
  if (_sbDeviceId) return _sbDeviceId;
  return new Promise(resolve => {
    chrome.storage.local.get(['faDeviceId'], stored => {
      if (stored.faDeviceId) {
        _sbDeviceId = stored.faDeviceId;
        resolve(_sbDeviceId);
        return;
      }
      const id = crypto.randomUUID();
      chrome.storage.local.set({ faDeviceId: id });
      _sbDeviceId = id;
      resolve(id);
    });
  });
}

// ── REST helper ──────────────────────────────────────────────────────────────
async function sbReq(path, options = {}) {
  const cfg = await sbGetConfig();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.key,
        'Authorization': `Bearer ${cfg.key}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch { return null; }
}

// ── Profiles ─────────────────────────────────────────────────────────────────
async function sbPushProfiles(profiles, activeProfileId) {
  const deviceId = await sbGetDeviceId();
  const rows = profiles.map(p => ({
    device_id:  deviceId,
    profile_id: p.id,
    name:       p.name,
    profile:    p.profile || {},
    extras:     p.extras  || {},
    is_active:  p.id === activeProfileId,
    updated_at: new Date().toISOString(),
  }));
  await sbReq('fa_profiles?on_conflict=device_id,profile_id', {
    method:  'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body:    JSON.stringify(rows),
  });
}

async function sbDeleteProfile(profileId) {
  const deviceId = await sbGetDeviceId();
  await sbReq(
    `fa_profiles?device_id=eq.${encodeURIComponent(deviceId)}&profile_id=eq.${encodeURIComponent(profileId)}`,
    { method: 'DELETE' }
  );
}

async function sbFetchProfiles() {
  const deviceId = await sbGetDeviceId();
  const rows = await sbReq(
    `fa_profiles?device_id=eq.${encodeURIComponent(deviceId)}&order=created_at.asc`
  );
  if (!rows?.length) return null;
  const profiles = rows.map(r => ({
    id:      r.profile_id,
    name:    r.name,
    profile: r.profile || {},
    extras:  r.extras  || {},
  }));
  const activeRow      = rows.find(r => r.is_active);
  const activeProfileId = activeRow?.profile_id || profiles[0]?.id;
  return { profiles, activeProfileId };
}

// ── History ──────────────────────────────────────────────────────────────────
async function sbPushHistoryEntry(entry) {
  const deviceId = await sbGetDeviceId();
  await sbReq('fa_history', {
    method:  'POST',
    headers: { 'Prefer': 'return=minimal' },
    body:    JSON.stringify({
      device_id:   deviceId,
      domain:      entry.domain,
      title:       entry.title,
      url:         entry.url,
      field_count: entry.fieldCount,
      profile_id:  entry.profileId || null,
      ts:          entry.ts,
    }),
  });
}

async function sbFetchHistory() {
  const deviceId = await sbGetDeviceId();
  return sbReq(
    `fa_history?device_id=eq.${encodeURIComponent(deviceId)}&order=ts.desc&limit=30`
  ).then(rows => rows?.map(r => ({
    domain:     r.domain,
    title:      r.title,
    url:        r.url,
    fieldCount: r.field_count,
    profileId:  r.profile_id,
    ts:         r.ts,
    sbId:       r.id,
  })) || null);
}

async function sbClearHistory() {
  const deviceId = await sbGetDeviceId();
  await sbReq(
    `fa_history?device_id=eq.${encodeURIComponent(deviceId)}`,
    { method: 'DELETE' }
  );
}
