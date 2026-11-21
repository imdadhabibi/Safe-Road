(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { map:null, accidents:null, blackspots:[], blacklinks:[], blackspotKml:null, accidentLayer:null, blackspotKmlLayer:null, blacklinkLayer:null, potholeLayer:null, userMarker:null, accuracy:null, selected:'blackspot', page:1, size:12, picking:false, watchId:null, profile:null };
  const files = {
    accidents:'data/accidents-coordinates.json',
    blackspot:'data/blackspot-segments.json.gz.b64',
    blacklink:'data/blacklink-roads.json.gz.b64',
    blacklinkGeometry:'data/blacklink-geometry-10-roads.geojson.gz.b64',
    blackspotKml:'data/blackspot-sta-10-jalan.compact.gz.b64'
  };
  async function getJSON(path) {
    const r=await fetch(path,{cache:'no-cache'});
    if(!r.ok) throw new Error('Tidak dapat memuat '+path+' ('+r.status+')');
    if(path.endsWith('accidents-coordinates.json')) {
      const manifest=await r.json();
      const parts=await Promise.all(manifest.parts.map(async part=>{
        const response=await fetch(part,{cache:'no-cache'});
        if(!response.ok) throw new Error('Bagian data kecelakaan tidak ditemukan: '+part);
        return (await response.text()).trim();
      }));
      if(!window.DecompressionStream) throw new Error('Browser perlu mendukung DecompressionStream. Gunakan Chrome, Edge, Firefox, atau Safari terbaru.');
      const binary=atob(parts.join('')), bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const coords=JSON.parse(await new Response(stream).text());
      return {type:'FeatureCollection',features:coords.map((xy,i)=>({
        type:'Feature',geometry:{type:'Point',coordinates:xy},
        properties:{event_label:'Kejadian kecelakaan historis 2025',record_number:i+1}
      }))};
    }
    if(path.endsWith('.gz.b64')) {
      if(!window.DecompressionStream) throw new Error('Browser perlu mendukung DecompressionStream. Gunakan Chrome, Edge, Firefox, atau Safari terbaru.');
      const b64=(await r.text()).trim(), bin=atob(b64), bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
      const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    }
    return r.json();
  }
  function initMap() {
    if(!window.L) { $('map-status').textContent='Leaflet gagal dimuat. Periksa koneksi internet.'; return; }
    state.map=L.map('map',{scrollWheelZoom:true}).setView([-7.72,109.02],10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(state.map);
    state.accidentLayer=L.featureGroup().addTo(state.map); state.blackspotKmlLayer=L.layerGroup(); state.blacklinkLayer=L.layerGroup().addTo(state.map); state.potholeLayer=L.layerGroup().addTo(state.map);
    state.map.on('click',e=>{
      if(!state.picking)return;
      $('latitude').value=e.latlng.lat.toFixed(7); $('longitude').value=e.latlng.lng.toFixed(7);
      $('coordinate-status').textContent='Pin manual dipilih. Periksa kembali lokasi.';
      state.picking=false; $('pick-map-location').textContent='Pilih titik pada peta';
      $('map').classList.remove('map-picking'); $('laporan').scrollIntoView({behavior:'smooth'});
    });
    setTimeout(()=>state.map.invalidateSize(),250);
  }
  function renderAccidents() {
    if(!state.map || !state.accidents)return;
    state.accidentLayer.clearLayers();
    const layer=L.geoJSON(state.accidents,{
      pointToLayer:(_f,ll)=>L.circleMarker(ll,{radius:4,color:'#bd3044',weight:1,fillColor:'#e23d4d',fillOpacity:.72}),
      onEachFeature:(f,l)=>{
        const p=f.properties||{};
        l.bindPopup('<b>'+esc(p.road_name||'Lokasi kecelakaan')+'</b><br>'+esc(p.event_date||'-')+' '+esc(p.event_time||'')+
          '<br>Kategori: '+esc(p.accident_category||'-')+'<br>Tingkat: '+esc(p.severity_label||'-')+
          '<br>Meninggal: '+fmt(p.fatalities)+' · Luka ringan: '+fmt(p.minor_injuries));
      }
    });
    layer.eachLayer(l=>state.accidentLayer.addLayer(l));
    if($('toggle-accidents').checked)state.accidentLayer.addTo(state.map);
    const fs=state.accidents.features||[];
    $('accident-layer-count').textContent=fmt(fs.length)+' titik GPS dari sheet Fix';
    $('stat-accidents').textContent=fmt(fs.length);
    // Total fatalities is from the source workbook Fix (1,081 events; 195 fatalities). Coordinate archive is intentionally public-coordinate-only.
    $('stat-fatalities').textContent='195';
    $('map-status').textContent=fmt(fs.length)+' titik kecelakaan historis berhasil dimuat. Memuat titik Blackspot dari file KML terbaru.';
    if(fs.length)state.map.fitBounds(state.accidentLayer.getBounds().pad(.06));
  }
  function renderBlackspotKml(data) {
    if(!state.map || !data || !Array.isArray(data.points))return;
    state.blackspotKmlLayer.clearLayers();
    const features=data.points.map(row=>{
      const [fid,lon,lat,roadIndex,distance,remarkIndex]=row;
      return {
        type:'Feature',
        geometry:{type:'Point',coordinates:[lon/1000000,lat/1000000]},
        properties:{
          fid,
          road_name:data.roads[roadIndex]||'Nama ruas tidak tersedia',
          distance_m:distance>=0?distance:'',
          remark:data.remarks[remarkIndex]||'',
          source_file:'Blackspot Cilacap.kml'
        }
      };
    });
    const layer=L.geoJSON({type:'FeatureCollection',features},{
      pointToLayer:(_feature,latlng)=>L.circleMarker(latlng,{
        radius:5,color:'#a85a08',weight:1.5,fillColor:'#f59e0b',fillOpacity:.88
      }),
      onEachFeature:(feature,marker)=>{
        const p=feature.properties||{};
        marker.bindPopup(
          '<b>'+esc(p.road_name)+'</b><br><b>Layer:</b> Blackspot'+
          '<br><b>Nomor titik:</b> '+esc(p.fid)+
          '<br><b>Jarak STA:</b> '+(p.distance_m!==''?fmt(p.distance_m)+' m':'Tidak tercantum')+
          '<br><b>Keterangan ruas:</b> '+esc(p.remark||'-')+
          '<br><b>Sumber:</b> '+esc(p.source_file)
        );
        marker.bindTooltip(esc(p.road_name)+(p.distance_m!==''?' · '+fmt(p.distance_m)+' m':''),{sticky:true});
      }
    });
    layer.eachLayer(marker=>state.blackspotKmlLayer.addLayer(marker));
    if($('toggle-blackspot').checked)state.blackspotKmlLayer.addTo(state.map);
    else state.map.removeLayer(state.blackspotKmlLayer);
    $('blackspot-layer-count').textContent=fmt(features.length)+' titik pada '+fmt(data.roads.length)+' ruas · KML terbaru';\n    $('stat-blackspot').textContent=fmt(features.length);
    $('map-status').textContent='Data peta dimuat: '+fmt((state.accidents?.features||[]).length)+' titik kecelakaan historis, '+fmt(features.length)+' titik Blackspot dari '+fmt(data.roads.length)+' ruas, serta geometri Blacklink yang tersedia.';
    const bounds=L.featureGroup([state.accidentLayer,state.blackspotKmlLayer]).getBounds();
    if(bounds.isValid())state.map.fitBounds(bounds.pad(0.06),{maxZoom:11});
  }

  function renderBlacklinkGeometry(data) {
    if(!state.map || !data)return;
    state.blacklinkLayer.clearLayers();
    const lineLayer=L.geoJSON(data,{
      style:()=>({color:'#7456c7',weight:5,opacity:.9,lineCap:'round',lineJoin:'round'}),
      onEachFeature:(feature,layer)=>{
        const p=feature.properties||{};
        layer.bindPopup('<b>Jalan Blacklink</b><br>'+esc(p.road_name||'Nama ruas tidak tersedia')+
          '<br>Segmen geometri: '+esc(p.segment_feature??'-')+
          '<br>Sumber CRS: '+esc(p.source_crs||'EPSG:32749')+
          '<br><small>Geometri berasal dari GeoPackage 10 Jalan Terbaik.</small>');
        layer.bindTooltip(esc(p.road_name||'Jalan Blacklink'),{sticky:true});
      }
    });
    lineLayer.eachLayer(layer=>state.blacklinkLayer.addLayer(layer));
    if($('toggle-blacklink').checked)state.blacklinkLayer.addTo(state.map);
    const bounds=lineLayer.getBounds();
    if(bounds.isValid())state.map.fitBounds(bounds.pad(0.07),{maxZoom:12});
    state.accidentLayer.eachLayer(layer=>{if(layer.bringToFront)layer.bringToFront();});
    $('blacklink-layer-count').textContent=fmt((data.features||[]).length)+' segmen pada 10 ruas dari GeoPackage';
    $('map-status').textContent='Data peta: '+fmt((state.accidents?.features||[]).length)+' titik kecelakaan, '+fmt((data.features||[]).length)+' segmen geometri Blacklink dari 10 ruas. 13 ruas Blacklink lainnya masih tersedia pada tabel, tetapi geometri belum tersedia dari file ini.';
  }
  const pill=s=>'<span class="status-pill '+(s==='Terverifikasi'?'status-verified':s==='Ditolak'?'status-rejected':s==='Sudah Ditangani'?'status-done':'status-pending')+'">'+esc(s)+'</span>';
  async function renderVerifiedReports(){
    if(!state.map)return;
    state.potholeLayer.clearLayers();
    try{
      const rows=await SafeRoadStore.getVerifiedReports();
      rows.filter(r=>Number.isFinite(r.latitude) && Number.isFinite(r.longitude)).forEach(r=>{
        L.circleMarker([r.latitude,r.longitude],{radius:8,color:'#b77912',weight:2,fillColor:'#e8ad20',fillOpacity:.9})
         .bindPopup('<b>Jalan berlubang terverifikasi</b><br>'+esc(r.roadName)).addTo(state.potholeLayer);
      });
      if($('toggle-potholes').checked)state.potholeLayer.addTo(state.map);
    }catch(err){
      $('map-status').textContent='Layer laporan online belum tersedia: '+err.message;
    }
  }
  async function renderMyReports(){
    const box=$('my-reports');let sent=[];
    try{sent=JSON.parse(localStorage.getItem('saferoad-report-tickets')||'[]')}catch(_){}
    let html='';
    try{
      const user=await SafeRoadStore.currentUser();
      if(user){
        const rows=await SafeRoadStore.getMyReports();
        html+='<p class="muted-text">Login sebagai '+esc(user.email||'pengguna')+'. Riwayat akun tersimpan di database dan dapat dibuka dari perangkat lain.</p>';
        html+=rows.length?rows.map(r=>'<article class="report-item"><div><b>'+esc(r.road_name)+'</b><small>'+esc(r.id)+' · '+new Date(r.created_at).toLocaleString('id-ID')+'</small></div>'+pill(r.status)+'</article>').join(''):'<p class="muted-text">Belum ada laporan pada akun ini.</p>';
        html+='<p><a href="akun.html">Kelola akun ↗</a> · <button class="text-button" id="home-logout">Keluar</button></p>';
      }else html+='<p class="muted-text">Anda belum login. Laporan tanpa akun dapat dilacak menggunakan kode rahasia yang diberikan setelah pengiriman.</p><p><a href="akun.html">Login / Daftar akun pelapor ↗</a></p>';
    }catch(e){html+='<p class="muted-text">Riwayat akun belum dapat dimuat: '+esc(e.message)+'</p>'}
    if(sent.length)html+='<h3>Referensi tersimpan pada perangkat ini</h3>'+sent.slice(0,5).map(r=>'<article class="report-item"><div><b>'+esc(r.roadName)+'</b><small>ID: '+esc(r.id)+'</small></div><span class="status-pill status-pending">Gunakan kode</span></article>').join('');
    box.innerHTML=html;
    const logout=$('home-logout');if(logout)logout.addEventListener('click',async()=>{await window.safeRoadSupabase.auth.signOut();await renderMyReports()});
  }
  function renderTable(){
    const bs=state.selected==='blackspot', data=bs?state.blackspots:state.blacklinks;
    const query=$('analysis-search').value.trim().toLowerCase();
    const found=data.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(query)));
    const pages=Math.max(1,Math.ceil(found.length/state.size));state.page=Math.min(state.page,pages);
    const rows=found.slice((state.page-1)*state.size,state.page*state.size);
    const cols=bs?[['road_name','Ruas jalan'],['sta_text','STA / rentang'],['accident_count_xi','Kecelakaan (Xi)'],['total_xi','Total Xi'],['si','SI'],['status','Status']]
      :[['road_name','Ruas jalan'],['total_accidents','Kecelakaan'],['fatalities','Meninggal'],['serious_injuries','Luka berat'],['minor_injuries','Luka ringan'],['ean_total','EAN total'],['ucl','UCL'],['bka','BKA'],['rank','Peringkat'],['classification','Klasifikasi']];
    $('analysis-head').innerHTML='<tr>'+cols.map(c=>'<th>'+c[1]+'</th>').join('')+'</tr>';
    $('analysis-body').innerHTML=rows.length?rows.map(r=>'<tr>'+cols.map(([k])=>'<td>'+esc(typeof r[k]==='number'?r[k].toLocaleString('id-ID',{maximumFractionDigits:2}):r[k]??'-')+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+cols.length+'">Data tidak ditemukan.</td></tr>';
    $('analysis-count').textContent=fmt(found.length)+' data · sumber '+(bs?'CUSSUM':'EAN & UCL');
    $('page-indicator').textContent='Halaman '+state.page+' dari '+pages;
    $('prev-page').disabled=state.page<=1;$('next-page').disabled=state.page>=pages;
    $('download-current').disabled=!data.length;
  }
  function downloadCSV(){
    const bs=state.selected==='blackspot', rows=bs?state.blackspots:state.blacklinks;
    if(!rows.length)return;
    const fields=Object.keys(rows[0]), csv=[fields.join(','),...rows.map(r=>fields.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=(bs?'jalan-blackspot':'jalan-blacklink')+'.csv';a.click();URL.revokeObjectURL(url);
  }
  function readProfile(){return null}
  function ensureProfile(){
    const name=$('reporter-name').value.trim()||'Pengguna SafeRoad';
    const contact=$('reporter-contact').value.trim();
    $('profile-box').hidden=false;
    $('profile-box').innerHTML='<b>Pelapor:</b> '+esc(name)+(contact?' · '+esc(contact):'')+'<br><small>Informasi ini hanya diteruskan bersama laporan kepada petugas admin.</small>';
    return {name,contact};
  }
  function setCoordinates(lat,lon,msg){$('latitude').value=lat.toFixed(7);$('longitude').value=lon.toFixed(7);$('coordinate-status').textContent=msg||'Koordinat berhasil diisi.'}
  function gps(target){
    if(!navigator.geolocation){$('map-status').textContent='Browser tidak mendukung GPS.';return}
    const button=$(target),old=button.textContent;button.disabled=true;button.textContent='Mencari lokasi…';
    const success=pos=>{
      const {latitude:lat,longitude:lon,accuracy}=pos.coords;
      if(target==='get-location'){
        if(state.userMarker)state.map.removeLayer(state.userMarker);if(state.accuracy)state.map.removeLayer(state.accuracy);
        state.userMarker=L.marker([lat,lon]).addTo(state.map).bindPopup('Posisi Anda · akurasi ±'+Math.round(accuracy)+' m').openPopup();
        state.accuracy=L.circle([lat,lon],{radius:accuracy,color:'#1769df',fillOpacity:.08,weight:1}).addTo(state.map);
        state.map.setView([lat,lon],15);$('map-status').textContent='Lokasi GPS aktif. Akurasi ±'+Math.round(accuracy)+' meter.';
        button.textContent='◎ Aktifkan GPS';
        nearby(lat,lon);
      }else{setCoordinates(lat,lon,'GPS diperoleh · akurasi ±'+Math.round(accuracy)+' m. Periksa titik sebelum mengirim.');button.textContent=old}
      button.disabled=false;
    };
    const fail=e=>{const m=e.code===1?'Izin lokasi ditolak. Aktifkan izin lokasi browser.':'Lokasi tidak dapat diperoleh. Periksa GPS dan koneksi.';if(target==='get-location')$('map-status').textContent=m;else $('coordinate-status').textContent=m;button.disabled=false;button.textContent=old};
    navigator.geolocation.getCurrentPosition(success,fail,{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
  }
  function distance(a,b,c,d){const rad=x=>x*Math.PI/180,R=6371000,p=rad(c-a),q=rad(d-b),x=Math.sin(p/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(q/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
  async function nearby(lat,lon){
    try{
      const reports=await SafeRoadStore.getVerifiedReports();
      const near=reports.filter(r=>distance(lat,lon,r.latitude,r.longitude)<=500);
      $('safety-note').textContent=near.length?'Perhatian: ada '+near.length+' laporan jalan berlubang terverifikasi dalam radius 500 meter. Kurangi kecepatan dan tetap waspada.':'Tidak ada laporan jalan berlubang terverifikasi dalam radius 500 meter dari lokasi GPS Anda. Layer historis tidak otomatis menjadi peringatan.';
      if(near.length)$('safety-note').parentElement.parentElement.classList.add('notice-active');
      else $('safety-note').parentElement.parentElement.classList.remove('notice-active');
    }catch(err){
      $('safety-note').textContent='Data peringatan online belum dapat dimuat: '+err.message;
    }
  }
  async function reportSubmit(e){
    e.preventDefault();$('report-message').textContent='';
    if(!$('report-form').reportValidity())return;
    const lat=Number($('latitude').value),lon=Number($('longitude').value),file=$('report-photo').files[0];
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180){$('report-message').textContent='Koordinat tidak valid.';return}
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){$('report-message').textContent='Unggah foto JPG/PNG/WEBP maksimal 5 MB.';return}
    if(!$('report-consent').checked){$('report-message').textContent='Persetujuan wajib dicentang.';return}
    const profile=ensureProfile();
    const submitButton=$('report-form').querySelector('[type="submit"]');
    submitButton.disabled=true;submitButton.textContent='Mengirim laporan…';
    try{
      const now=new Date().toISOString();
      const report={id:'SR-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,8).toUpperCase(),
        reporterName:profile.name,reporterContact:profile.contact,roadName:$('road-name').value.trim(),
        description:$('report-description').value.trim(),latitude:lat,longitude:lon,
        photoBlob:file.slice(0,file.size,file.type),photoType:file.type};
      const result=await SafeRoadStore.addReport(report);
      let tickets=[];try{tickets=JSON.parse(localStorage.getItem('saferoad-report-tickets')||'[]')}catch(_){}
      tickets.unshift({id:result.id,roadName:result.roadName,createdAt:result.createdAt,trackingToken:result.trackingToken});
      localStorage.setItem('saferoad-report-tickets',JSON.stringify(tickets.slice(0,10)));
      $('report-form').reset();
      $('photo-preview').classList.add('hidden');$('photo-preview').removeAttribute('src');
      $('coordinate-status').textContent='Koordinat belum diisi.';
      $('report-message').innerHTML='Laporan berhasil dikirim. Kode pelacakan rahasia Anda:<br><b>'+esc(result.trackingToken)+'</b><br>Simpan kode ini untuk memeriksa status laporan dari perangkat lain. ID: '+esc(result.id)+'. Status: Menunggu Verifikasi.';
      $('report-message').className='form-message success';
      renderMyReports();
    }catch(err){
      $('report-message').textContent='Gagal mengirim laporan: '+err.message;
      $('report-message').className='form-message error';
    }finally{
      submitButton.disabled=false;submitButton.textContent='Kirim laporan →';
    }
  }
  function setup(){
    $('mobile-menu').addEventListener('click',()=>{const open=$('main-nav').classList.toggle('open');$('mobile-menu').setAttribute('aria-expanded',String(open))});
    $('main-nav').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('main-nav').classList.remove('open')));
    $('toggle-accidents').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.accidentLayer.addTo(state.map):state.map.removeLayer(state.accidentLayer)});
    $('toggle-blackspot').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.blackspotKmlLayer.addTo(state.map):state.map.removeLayer(state.blackspotKmlLayer)});
    $('toggle-blacklink').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.blacklinkLayer.addTo(state.map):state.map.removeLayer(state.blacklinkLayer)});
    $('toggle-potholes').addEventListener('change',e=>{if(!state.map)return;e.target.checked?renderVerifiedReports():state.map.removeLayer(state.potholeLayer)});
    $('toggle-user').addEventListener('change',e=>{if(e.target.checked)return;if(state.userMarker)state.map.removeLayer(state.userMarker);if(state.accuracy)state.map.removeLayer(state.accuracy);state.userMarker=state.accuracy=null});
    $('get-location').addEventListener('click',()=>gps('get-location'));$('report-gps').addEventListener('click',()=>gps('report-gps'));
    $('pick-map-location').addEventListener('click',()=>{state.picking=!state.picking;$('pick-map-location').textContent=state.picking?'Klik lokasi pada peta…':'Pilih titik pada peta';$('coordinate-status').textContent=state.picking?'Klik titik yang diinginkan pada peta.':'Pemilihan titik dibatalkan.';$('map').classList.toggle('map-picking',state.picking);if(state.picking)$('peta').scrollIntoView({behavior:'smooth'})});
    $('tracking-form').addEventListener('submit',async e=>{
      e.preventDefault();const box=$('tracking-result'),token=$('tracking-code').value.trim();
      box.textContent='Mencari laporan…';
      try{
        const r=await SafeRoadStore.getTrackingReport(token);
        const statusClass=r.status==='Terverifikasi'?'status-verified':r.status==='Ditolak'?'status-rejected':r.status==='Sudah Ditangani'?'status-done':'status-pending';
        box.innerHTML='<article class="report-item"><div><b>'+esc(r.road_name)+'</b><small>'+esc(r.report_id)+' · '+new Date(r.created_at).toLocaleString('id-ID')+'</small></div><span class="status-pill '+statusClass+'">'+esc(r.status)+'</span></article><small class="muted-text">Pembaruan terakhir: '+(r.updated_at?new Date(r.updated_at).toLocaleString('id-ID'):'Belum ada')+'</small>';
      }catch(err){box.textContent=err.message}
    });
    $('report-form').addEventListener('submit',reportSubmit);
    $('report-photo').addEventListener('change',()=>{const f=$('report-photo').files[0];if(!f)return;const old=$('photo-preview').dataset.url;if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(f);$('photo-preview').dataset.url=url;$('photo-preview').src=url;$('photo-preview').classList.remove('hidden')});
    document.querySelectorAll('.data-tab').forEach(b=>b.addEventListener('click',()=>{state.selected=b.dataset.kind;state.page=1;document.querySelectorAll('.data-tab').forEach(x=>x.classList.toggle('active',x===b));renderTable()}));
    $('analysis-search').addEventListener('input',()=>{state.page=1;renderTable()});
    $('prev-page').addEventListener('click',()=>{state.page=Math.max(1,state.page-1);renderTable()});$('next-page').addEventListener('click',()=>{state.page++;renderTable()});$('download-current').addEventListener('click',downloadCSV);
    window.addEventListener('resize',()=>state.map&&setTimeout(()=>state.map.invalidateSize(),120));
    window.addEventListener('focus',()=>{renderMyReports();renderVerifiedReports()});
  }
  async function boot(){
    setup();state.profile=readProfile();$('profile-box').hidden=!state.profile;
    if(state.profile)$('profile-box').innerHTML='<b>Profil demo:</b> '+esc(state.profile.name)+'<br><small>Hanya tersimpan di browser ini.</small>';
    initMap();
    try{
      const [acc,bs,bl]=await Promise.all([getJSON(files.accidents),getJSON(files.blackspot),getJSON(files.blacklink)]);
      state.accidents=acc;state.blackspots=bs;state.blacklinks=bl;
      renderAccidents();renderTable();
      $('stat-blackspot').textContent='—';$('stat-blacklink').textContent=fmt(bl.length);
      $('map-status').textContent='Data dimuat: '+fmt(acc.features.length)+' titik kecelakaan historis, '+fmt(bs.length)+' data Blackspot pada tabel, dan '+fmt(bl.length)+' ruas Blacklink. Sedang memuat titik Blackspot dari KML.';
      try {
        const blackspotKml=await getJSON(files.blackspotKml);
        state.blackspotKml=blackspotKml;
        renderBlackspotKml(blackspotKml);
      } catch(blackspotError) {
        $('blackspot-layer-count').textContent='Data Blackspot STA gagal dimuat';
        $('map-status').textContent='Peta dasar tetap tersedia. Blackspot KML gagal dimuat: '+blackspotError.message;
      }
      try { const geometry=await getJSON(files.blacklinkGeometry); renderBlacklinkGeometry(geometry); }
      catch(geometryError) { $('blacklink-layer-count').textContent='Geometri belum dapat dimuat'; $('map-status').textContent='Data tabel dan titik kecelakaan tersedia. Geometri Blacklink gagal dimuat: '+geometryError.message; }
    }catch(err){$('map-status').textContent=err.message+' Jalankan melalui HTTPS/localhost dan pastikan folder data tersedia.';$('analysis-body').innerHTML='<tr><td>Data belum dapat dimuat: '+esc(err.message)+'</td></tr>'}
    await renderMyReports();await renderVerifiedReports();
  }
  document.addEventListener('DOMContentLoaded',boot);
})();