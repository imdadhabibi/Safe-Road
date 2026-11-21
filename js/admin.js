(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statuses=['Menunggu Verifikasi','Terverifikasi','Perlu Pemeriksaan Lebih Lanjut','Ditolak','Sudah Ditangani'];
  let reports=[],selected=null,photoUrl=null;
  const cls=s=>s==='Terverifikasi'?'status-verified':s==='Ditolak'?'status-rejected':s==='Sudah Ditangani'?'status-done':'status-pending';
  const pill=s=>'<span class="status-pill '+cls(s)+'">'+esc(s)+'</span>';
  async function refresh(){
    try{
      reports=await SafeRoadStore.getAllReports();
      $('total-count').textContent=reports.length;
      $('pending-count').textContent=reports.filter(r=>r.status==='Menunggu Verifikasi').length;
      $('verified-count').textContent=reports.filter(r=>r.status==='Terverifikasi').length;
      $('done-count').textContent=reports.filter(r=>r.status==='Sudah Ditangani').length;
      renderList();
      if(selected&&reports.some(r=>r.id===selected))await detail(selected);
      else if(!reports.length)$('report-detail').innerHTML='<h2>Detail laporan</h2><p class="muted-text">Belum ada laporan masuk.</p>';
    }catch(e){$('report-list').textContent='Gagal memuat antrean dari database: '+e.message}
  }
  function renderList(){
    const status=$('status-filter').value,q=$('search-report').value.trim().toLowerCase();
    const rows=reports.filter(r=>(status==='Semua'||r.status===status)&&[r.id,r.roadName,r.reporterName].some(v=>String(v||'').toLowerCase().includes(q)));
    $('report-list').innerHTML=rows.length?rows.map(r=>'<article class="admin-report '+(r.id===selected?'active':'')+'" tabindex="0" role="button" data-id="'+esc(r.id)+'"><b>'+esc(r.roadName)+'</b><small>'+esc(r.id)+' · '+new Date(r.createdAt).toLocaleString('id-ID')+'</small><small>'+esc(r.reporterName)+' · '+pill(r.status)+'</small></article>').join(''):'<div class="empty-state">Tidak ada laporan untuk filter ini.</div>';
    $('report-list').querySelectorAll('[data-id]').forEach(el=>{el.addEventListener('click',()=>detail(el.dataset.id));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();detail(el.dataset.id)}})});
  }
  async function detail(id){
    const r=reports.find(x=>x.id===id)||await SafeRoadStore.getReport(id);if(!r)return;selected=id;renderList();
    if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=r.photoPath?await SafeRoadStore.getPhotoUrl(r.photoPath):null;
    const opts=statuses.map(s=>'<option '+(r.status===s?'selected':'')+'>'+esc(s)+'</option>').join('');
    const hist=(r.history||[]).map(h=>'<li><b>'+esc(h.status)+'</b> · '+new Date(h.at).toLocaleString('id-ID')+'<br>'+esc(h.by||'-')+' — '+esc(h.note||'')+'</li>').join('');
    $('report-detail').innerHTML='<h2>Detail laporan</h2>'+pill(r.status)+
      '<div class="detail-line"><span>ID laporan:</span><br><b>'+esc(r.id)+'</b></div>'+
      '<div class="detail-line"><span>Pelapor:</span><br>'+esc(r.reporterName)+(r.reporterContact?' · '+esc(r.reporterContact):'')+'</div>'+
      '<div class="detail-line"><span>Nama ruas:</span><br><b>'+esc(r.roadName)+'</b></div>'+
      '<div class="detail-line"><span>Waktu:</span><br>'+new Date(r.createdAt).toLocaleString('id-ID')+'</div>'+
      '<div class="detail-line"><span>Koordinat:</span><br>'+Number(r.latitude).toFixed(7)+', '+Number(r.longitude).toFixed(7)+' <a target="_blank" rel="noopener" href="https://www.google.com/maps?q='+encodeURIComponent(r.latitude+','+r.longitude)+'">Buka peta ↗</a></div>'+
      '<div class="detail-line"><span>Deskripsi:</span><br>'+esc(r.description)+'</div>'+
      (photoUrl?'<p class="photo-label">Foto kondisi jalan</p><img src="'+photoUrl+'" alt="Foto laporan jalan berlubang">':'<p class="muted-text">Foto tidak tersedia.</p>')+
      '<hr style="border:0;border-top:1px solid #edf1f5;margin:18px 0">'+
      '<label class="muted-text" for="new-status">Status laporan</label><select id="new-status" style="width:100%;padding:11px;border:1px solid var(--bd);border-radius:10px;margin:6px 0 12px">'+opts+'</select>'+
      '<label class="muted-text" for="admin-note">Catatan verifikasi / alasan perubahan</label><textarea class="admin-note" id="admin-note" placeholder="Tuliskan hasil pemeriksaan, alasan penolakan, atau bukti penanganan…">'+esc(r.adminNote||'')+'</textarea>'+
      '<div class="admin-actions"><button class="button button-primary" id="save-status">Simpan perubahan</button></div>'+
      '<h3 style="font-size:15px;margin:22px 0 8px">Riwayat status</h3><ol class="history-list">'+(hist||'<li>Belum ada riwayat.</li>')+'</ol>';
    $('save-status').addEventListener('click',async()=>{
      const next=$('new-status').value,note=$('admin-note').value.trim();
      if(next==='Ditolak'&&!note){alert('Alasan penolakan wajib diisi.');return}
      if(next==='Sudah Ditangani'&&!note){alert('Catatan atau bukti penanganan wajib diisi.');return}
      try{
        await SafeRoadStore.updateReport(id,current=>{
          if(current.status!==next||current.adminNote!==note){current.history=current.history||[];current.history.push({status:next,at:new Date().toISOString(),by:'Admin SafeRoad',note:note||'Status diperbarui.'})}
          current.status=next;current.adminNote=note;current.updatedAt=new Date().toISOString();return current;
        });
        await refresh();alert('Perubahan berhasil disimpan ke database SafeRoad.');
      }catch(e){alert('Gagal menyimpan: '+e.message)}
    });
  }
  $('refresh').addEventListener('click',refresh);
  $('status-filter').addEventListener('change',renderList);
  $('search-report').addEventListener('input',renderList);
  $('reset-demo').addEventListener('click',async()=>{
    if(!confirm('Hapus seluruh laporan dari database? Tindakan ini tidak dapat dibatalkan.'))return;
    try{await SafeRoadStore.clearReports();selected=null;await refresh();$('report-detail').innerHTML='<h2>Detail laporan</h2><p class="muted-text">Data laporan berhasil dihapus.</p>'}catch(e){alert(e.message)}
  });
  refresh();
})();