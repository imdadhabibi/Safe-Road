/* Supabase client for the static SafeRoad website. */
(() => {
  'use strict';
  const cfg = window.SafeRoadSupabaseConfig || {};
  const valid = typeof cfg.url === 'string' && cfg.url.startsWith('https://') &&
    typeof cfg.publishableKey === 'string' &&
    cfg.publishableKey.length > 20 &&
    !cfg.url.includes('PASTE_') && !cfg.publishableKey.includes('PASTE_');

  if (!valid) {
    window.safeRoadSupabase = null;
    window.safeRoadSupabaseConfigured = false;
    return;
  }
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    window.safeRoadSupabase = null;
    window.safeRoadSupabaseConfigured = false;
    console.error('Supabase JS SDK gagal dimuat.');
    return;
  }
  window.safeRoadSupabase = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.safeRoadSupabaseConfigured = true;
})();
