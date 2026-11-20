/* SafeRoad V2 shared cloud store.
   Public: submit reports + read sanitized verified hazard points only.
   Admin: full report queue and verification actions (enforced by Supabase RLS). */
(() => {
  'use strict';
  const BUCKET = 'report-photos';
  const client = () => {
    if (!window.safeRoadSupabaseConfigured || !window.safeRoadSupabase) {
      throw new Error('Supabase belum dikonfigurasi. Isi URL dan Publishable Key di js/supabase-config.js.');
    }
    return window.safeRoadSupabase;
  };
  const fail = (error, fallback) => {
    if (!error) return;
    console.error(fallback, error);
    throw new Error(error.message || fallback);
  };
  const isAdmin = async () => {
    const { data, error } = await client().auth.getSession();
    if (error) fail(error, 'Gagal membaca sesi admin.');
    return data.session?.user?.app_metadata?.role === 'admin';
  };
  const fromRow = (r, publicView = false) => ({
    id: r.id,
    reporterName: r.reporter_name || '',
    reporterContact: r.reporter_contact || '',
    roadName: r.road_name || '',
    description: r.description || '',
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    photoPath: r.photo_path || '',
    photoType: r.photo_type || '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: publicView ? 'Terverifikasi' : r.status,
    adminNote: publicView ? '' : (r.admin_note || ''),
    history: publicView ? [] : (r.history || []),
    verifiedAt: r.verified_at || null,
    verifiedBy: r.verified_by || null
  });
  const extFor = type => ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type] || 'jpg');
  const newId = () => 'SR-' + Date.now().toString(36).toUpperCase() + '-' +
    (window.crypto?.randomUUID ? crypto.randomUUID().slice(0,8).toUpperCase() : Math.random().toString(36).slice(2,10).toUpperCase());

  async function addReport(report) {
    const sb = client();
    const file = report.photoBlob;
    if (!(file instanceof Blob)) throw new Error('Foto laporan tidak terbaca. Pilih ulang foto.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB.');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Format foto harus JPG, PNG, atau WEBP.');

    const id = report.id || newId();
    const photoPath = 'incoming/' + id + '.' + extFor(file.type);
    const upload = await sb.storage.from(BUCKET).upload(photoPath, file, {
      contentType: file.type, cacheControl: '3600', upsert: false
    });
    if (upload.error) fail(upload.error, 'Foto gagal diunggah.');

    const payload = {
      id,
      reporter_name: String(report.reporterName || '').trim().slice(0,80) || null,
      reporter_contact: String(report.reporterContact || '').trim().slice(0,25) || null,
      road_name: String(report.roadName || '').trim(),
      description: String(report.description || '').trim(),
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
      photo_path: photoPath,
      photo_type: file.type
    };
    const inserted = await sb.from('reports').insert(payload);
    if (inserted.error) fail(inserted.error, 'Laporan gagal disimpan ke database.');
    return { ...fromRow({ ...payload, created_at: new Date().toISOString(), status: 'Menunggu Verifikasi' }) };
  }

  async function getAllReports() {
    const sb = client();
    if (await isAdmin()) {
      const { data, error } = await sb.from('reports').select('*').order('created_at', { ascending: false });
      if (error) fail(error, 'Gagal mengambil antrean laporan admin.');
      return (data || []).map(r => fromRow(r));
    }
    const { data, error } = await sb.from('reports')
      .select('id,road_name,latitude,longitude,created_at')
      .order('created_at', { ascending: false });
    if (error) fail(error, 'Gagal memuat titik jalan berlubang terverifikasi.');
    return (data || []).map(r => fromRow(r, true));
  }

  async function getVerifiedReports() {
    const { data, error } = await client().from('reports')
      .select('id,road_name,description,latitude,longitude,created_at')
      .eq('status', 'Terverifikasi')
      .order('created_at', { ascending: false });
    if (error) fail(error, 'Gagal memuat titik laporan terverifikasi.');
    return (data || []).map(r => fromRow(r, true));
  }

  async function getReport(id) {
    if (!(await isAdmin())) throw new Error('Hanya admin yang dapat membuka detail laporan.');
    const { data, error } = await client().from('reports').select('*').eq('id', id).single();
    if (error) fail(error, 'Laporan tidak ditemukan atau akses ditolak.');
    return fromRow(data);
  }

  async function getPhotoUrl(path) {
    if (!path) return null;
    if (!(await isAdmin())) throw new Error('Foto laporan hanya dapat dilihat admin.');
    const { data, error } = await client().storage.from(BUCKET).createSignedUrl(path, 600);
    if (error) fail(error, 'Foto laporan tidak dapat dibuka.');
    return data.signedUrl;
  }

  async function updateReport(id, updater) {
    if (!(await isAdmin())) throw new Error('Hanya admin yang dapat mengubah laporan.');
    const sb = client();
    const current = await getReport(id);
    const next = updater({ ...current, history: [...(current.history || [])] });
    const { data: authData } = await sb.auth.getUser();
    const status = next.status || current.status;
    const payload = {
      status,
      admin_note: next.adminNote || null,
      history: next.history || [],
      updated_at: new Date().toISOString(),
      verified_at: status === 'Terverifikasi' ? (current.verifiedAt || new Date().toISOString()) : null,
      verified_by: status === 'Terverifikasi' ? authData.user.id : null
    };
    const { data, error } = await sb.from('reports').update(payload).eq('id', id).select('*').single();
    if (error) fail(error, 'Perubahan laporan gagal disimpan.');
    return fromRow(data);
  }

  async function clearReports() {
    if (!(await isAdmin())) throw new Error('Hanya admin yang dapat menghapus laporan.');
    const sb = client();
    const { data, error } = await sb.from('reports').select('id,photo_path');
    if (error) fail(error, 'Gagal membaca daftar laporan.');
    for (const row of data || []) {
      const { error: deleteError } = await sb.from('reports').delete().eq('id', row.id);
      if (deleteError) fail(deleteError, 'Gagal menghapus laporan ' + row.id);
      if (row.photo_path) await sb.storage.from(BUCKET).remove([row.photo_path]);
    }
  }

  window.SafeRoadStore = { addReport, getAllReports, getVerifiedReports, getReport, getPhotoUrl, updateReport, clearReports, isAdmin };
})();
