/* Admin page guard. Final authorization is enforced by PostgreSQL RLS. */
(async () => {
  'use strict';
  const login = () => location.replace('login.html');
  const sb = window.safeRoadSupabase;
  if (!window.safeRoadSupabaseConfigured || !sb) {
    location.replace('login.html?setup=required');
    return;
  }
  try {
    const { data, error } = await sb.auth.getSession();
    if (error || !data.session) return login();
    if (data.session.user?.app_metadata?.role !== 'admin') {
      await sb.auth.signOut();
      alert('Akun ini tidak memiliki hak akses admin SafeRoad.');
      return login();
    }
    document.addEventListener('DOMContentLoaded', () => {
      const logout = document.getElementById('admin-logout');
      if (logout) logout.addEventListener('click', async () => {
        await sb.auth.signOut();
        login();
      });
    });
  } catch (error) {
    console.error(error);
    login();
  }
})();
