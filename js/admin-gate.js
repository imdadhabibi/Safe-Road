(() => {
  'use strict';
  if (sessionStorage.getItem('saferoad_admin_demo') !== 'active') {
    location.replace('login.html');
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const logout = document.getElementById('admin-logout');
    if (logout) logout.addEventListener('click', () => {
      sessionStorage.removeItem('saferoad_admin_demo');
      location.replace('login.html');
    });
  });
})();