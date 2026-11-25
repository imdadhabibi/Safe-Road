/* SafeRoad V2 shared cloud store: public tracking + authenticated owner history + admin queue. */
(() => {
  'use strict';
  const BUCKET='report-photos';
  const client=()=>{if(!window.safeRoadSupabaseConfigured||!window.safeRoadSupabase)throw new Error('Supabase belum dikonfigurasi.');return window.safeRoadSupabase};
  const fail=(e,m)=>{if(e){console.error(m,e);throw new Error(e.message||m)}};
  const isAdmin=async()=>{const {data,error}=await client().auth.getSession();fail(error,'Gagal membaca sesi.');return data.session?.user?.app_metadata?.role==='admin'};
  // getUser() calls the Auth user endpoint and can throw "Auth session missing!" for guests.
  // getSession() is local/session-aware and safely returns null when the visitor is not signed in.
  const currentUser=async()=>{try{const {data,error}=await client().auth.getSession();if(error&&/auth session missing/i.test(error.message||''))return null;fail(error,'Gagal membaca sesi akun.');return data?.session?.user||null}catch(e){if(/auth session missing/i.test(e?.message||''))return null;throw e}};
  const fromRow=(r,publicView=false)=>({id:r.id,reporterName:r.reporter_name||'',reporterContact:r.reporter_contact||'',roadName:r.road_name||'',description:r.description||'',latitude:Number(r.latitude),longitude:Number(r.longitude),photoPath:r.photo_path||'',photoType:r.photo_type||'',createdAt:r.created_at,updatedAt:r.updated_at,status:r.status,adminNote:publicView?'':(r.admin_note||''),history:publicView?[]:(r.history||[]),verifiedAt:r.verified_at||null,verifiedBy:r.verified_by||null});
  const extFor=t=>({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[t]||'jpg');
  const newId=()=>'SR-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
  const newToken=()=>{const b=new Uint8Array(32);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};
  const hashToken=async token=>{const bytes=new TextEncoder().encode(token),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
  async function addReport(report){
    const sb=client(),file=report.photoBlob;
    if(!(file instanceof Blob)||file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Foto harus JPG/PNG/WEBP maksimal 5 MB.');
    const user=await currentUser(),id=report.id||newId(),token=newToken(),tokenHash=await hashToken(token);
    const photoPath='incoming/'+id+'.'+extFor(file.type);
    const upload=await sb.storage.from(BUCKET).upload(photoPath,file,{contentType:file.type,cacheControl:'3600',upsert:false});
    if(upload.error)fail(upload.error,'Foto gagal diunggah.');
    const payload={id,reporter_name:String(report.reporterName||'').trim().slice(0,80)||null,reporter_contact:String(report.reporterContact||'').trim().slice(0,25)||null,road_name:String(report.roadName||'').trim(),description:String(report.description||'').trim(),latitude:Number(report.latitude),longitude:Number(report.longitude),photo_path:photoPath,photo_type:file.type,reporter_user_id:user?.id||null,tracking_token_hash:tokenHash};
    const inserted=await sb.from('reports').insert(payload);
    if(inserted.error){await sb.storage.from(BUCKET).remove([photoPath]);fail(inserted.error,'Laporan gagal disimpan.')}
    return {id,trackingToken:token,roadName:payload.road_name,createdAt:new Date().toISOString(),status:'Menunggu Verifikasi',registered:!!user};
  }
  async function getAllReports(){
    const sb=client();
    if(await isAdmin()){const {data,error}=await sb.from('reports').select('*').order('created_at',{ascending:false});fail(error,'Gagal mengambil antrean admin.');return(data||[]).map(r=>fromRow(r))}
    return getVerifiedReports();
  }
  async function getVerifiedReports(){
    const {data,error}=await client().from('reports').select('id,road_name,latitude,longitude,created_at,status').eq('status','Terverifikasi').order('created_at',{ascending:false});
    fail(error,'Gagal memuat titik terverifikasi.');return(data||[]).map(r=>fromRow(r,true));
  }
  async function getMyReports(){
    const sb=client(),user=await currentUser();if(!user)return [];
    const {data,error}=await sb.from('reports').select('id,road_name,status,created_at,updated_at,verified_at').eq('reporter_user_id',user.id).order('created_at',{ascending:false});
    fail(error,'Gagal memuat riwayat akun.');return data||[];
  }
  async function getTrackingReport(token){
    if(!/^[a-f0-9]{64}$/i.test(String(token||'')))throw new Error('Kode pelacakan tidak valid.');
    const {data,error}=await client().rpc('get_report_tracking',{p_token:token});
    fail(error,'Gagal mencari laporan.');if(!data||!data.length)throw new Error('Laporan tidak ditemukan. Periksa kembali kode pelacakan.');
    return data[0];
  }
  async function getReport(id){if(!(await isAdmin()))throw new Error('Hanya admin dapat membuka detail laporan.');const {data,error}=await client().from('reports').select('*').eq('id',id).single();fail(error,'Laporan tidak ditemukan.');return fromRow(data)}
  async function getPhotoUrl(path){if(!path)return null;if(!(await isAdmin()))throw new Error('Foto laporan hanya dapat dilihat admin.');const {data,error}=await client().storage.from(BUCKET).createSignedUrl(path,600);fail(error,'Foto tidak dapat dibuka.');return data.signedUrl}
  async function updateReport(id,updater){
    if(!(await isAdmin()))throw new Error('Hanya admin dapat mengubah laporan.');
    const sb=client(),current=await getReport(id),next=updater({...current,history:[...(current.history||[])]}),{data:authData}=await sb.auth.getUser(),status=next.status||current.status;
    const payload={status,admin_note:next.adminNote||null,history:next.history||[],updated_at:new Date().toISOString(),verified_at:status==='Terverifikasi'?(current.verifiedAt||new Date().toISOString()):null,verified_by:status==='Terverifikasi'?authData.user.id:null};
    const {data,error}=await sb.from('reports').update(payload).eq('id',id).select('*').single();fail(error,'Perubahan gagal disimpan.');return fromRow(data);
  }
  async function clearReports(){if(!(await isAdmin()))throw new Error('Hanya admin dapat menghapus laporan.');const sb=client(),{data,error}=await sb.from('reports').select('id,photo_path');fail(error,'Gagal membaca laporan.');for(const row of data||[]){const {error:e}=await sb.from('reports').delete().eq('id',row.id);fail(e,'Gagal menghapus laporan.');if(row.photo_path)await sb.storage.from(BUCKET).remove([row.photo_path])}}
  window.SafeRoadStore={addReport,getAllReports,getVerifiedReports,getMyReports,getTrackingReport,getReport,getPhotoUrl,updateReport,clearReports,isAdmin,currentUser};
})();