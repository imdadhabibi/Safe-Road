/* SafeRoad local demo store. IndexedDB is local to this browser/device only. */
(function () {
  'use strict';
  const DB_NAME = 'saferoad-local-demo';
  const DB_VERSION = 1;
  let dbPromise;
  function openDB() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Browser tidak mendukung IndexedDB.'));
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('reports')) {
          const store = db.createObjectStore('reports', { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Gagal membuka database lokal.'));
      request.onblocked = () => reject(new Error('Database lokal sedang diblokir tab lain. Tutup tab SafeRoad lain lalu coba lagi.'));
    });
    return dbPromise;
  }
  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Operasi database gagal.'));
    });
  }
  async function addReport(report) {
    const db = await openDB(); const tx = db.transaction('reports', 'readwrite');
    return requestResult(tx.objectStore('reports').add(report));
  }
  async function getAllReports() {
    const db = await openDB(); const tx = db.transaction('reports', 'readonly');
    const rows = await requestResult(tx.objectStore('reports').getAll());
    return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  async function getReport(id) {
    const db = await openDB(); const tx = db.transaction('reports', 'readonly');
    return requestResult(tx.objectStore('reports').get(id));
  }
  async function clearReports() {
    const db = await openDB(); const tx = db.transaction('reports', 'readwrite');
    await requestResult(tx.objectStore('reports').clear());
  }
  async function updateReport(id, updater) {
    const db = await openDB(); const tx = db.transaction('reports', 'readwrite'); const store = tx.objectStore('reports');
    const current = await requestResult(store.get(id));
    if (!current) throw new Error('Laporan tidak ditemukan.');
    const updated = updater(current); await requestResult(store.put(updated)); return updated;
  }
  window.SafeRoadStore = { openDB, addReport, getAllReports, getReport, updateReport, clearReports };
})();