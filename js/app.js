(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString('id-ID');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { map:null, accidents:null, kmlAccidents:null, blackspots:[], blacklinks:[], accidentLayer:null, kmlAccidentLayer:null, blacklinkLayer:null, potholeLayer:null, userMarker:null, accuracy:null, selected:'blackspot', page:1, size:12, picking:false, watchId:null, profile:null };
  const files = {
    accidents:'data/accidents-coordinates.json',
    blackspot:'data/blackspot-segments.json.gz.b64',
    blacklink:'data/blacklink-roads.json.gz.b64',
    blacklinkGeometry:'data/blacklink-geometry-10-roads.geojson.gz.b64',\n    kmlAccidents:['data/accidents-kml-2025-danzel.geojson.gz.b64','data/accidents-kml-2025-fikar.geojson.gz.b64','data/accidents-kml-2025-imdad.geojson.gz.b64','data/accidents-kml-2025-fais.geojson.gz.b64'],\n    kmlAccidents:'data/accidents-kml-2025.geojson.gz.b64'
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
    state.accidentLayer=L.featureGroup().addTo(state.map); state.kmlAccidentLayer=L.layerGroup().addTo(state.map); state.blacklinkLayer=L.layerGroup().addTo(state.map); state.potholeLayer=L.layerGroup().addTo(state.map);
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
    $('map-status').textContent=fmt(fs.length)+' titik kecelakaan historis berhasil dimuat. Blackspot/Blacklink tersedia pada tabel analisis; geometri peta menunggu validasi GIS.';
    if(fs.length)state.map.fitBounds(state.accidentLayer.getBounds().pad(.06));
  }

  function renderKmlAccidents() {
    if(!state.map || !state.kmlAccidents)return;
    state.kmlAccidentLayer.clearLayers();
    const layer=L.geoJSON(state.kmlAccidents,{
      pointToLayer:(_f,ll)=>L.circleMarker(ll,{radius:5,color:'#8b5cf6',weight:1.5,fillColor:'#a78bfa',fillOpacity:.88}),
      onEachFeature:(f,l)=>{
        const p=f.properties||{};
        l.bindPopup('<b>'+esc(p.road_name||'Lokasi kecelakaan')+'</b><br>'+esc(p.dataset||'Titik Laka 2025')+
          '<br>Nomor titik: '+esc(p.record_number??'-')+'<br>Sumber file: '+esc(p.source_file||'-'));
      }
    });
    layer.eachLayer(l=>state.kmlAccidentLayer.addLayer(l));
    if($('toggle-kml-accidents').checked)state.kmlAccidentLayer.addTo(state.map);
    const count=(state.kmlAccidents.features||[]).length;
    $('kml-accident-layer-count').textContent=fmt(count)+' titik dari 4 file KML';
    $('map-status').textContent='Peta memuat '+fmt((state.accidents?.features||[]).length)+' titik pada dataset sebelumnya dan '+fmt(count)+' titik tambahan dari 4 file KML. Lapisan dipisah agar sumber data tetap dapat dibedakan.';
  }

  function renderKmlAccidents() {
    if(!state.map || !state.kmlAccidents)return;
    state.kmlAccidentLayer.clearLayers();
    const layer=L.geoJSON(state.kmlAccidents,{
      pointToLayer:(_f,ll)=>L.circleMarker(ll,{radius:5,color:'#8b5cf6',weight:1.5,fillColor:'#a78bfa',fillOpacity:.88}),
      onEachFeature:(f,l)=>{
        const p=f.properties||{};
        l.bindPopup('<b>'+esc(p.road_name||'Lokasi kecelakaan')+'</b><br>Titik laka Kabupaten Cilacap 2025'+
          '<br>Nomor titik: '+esc(p.record_number??'-')+'<br>Sumber file: '+esc(p.source_file||'-'));
      }
    });
    layer.eachLayer(l=>state.kmlAccidentLayer.addLayer(l));
    if($('toggle-kml-accidents').checked)state.kmlAccidentLayer.addTo(state.map);
    const count=(state.kmlAccidents.features||[]).length;
    $('kml-accident-layer-count').textContent=fmt(count)+' titik dari 4 file KML';
    $('map-status').textContent='Peta memuat '+fmt((state.accidents?.features||[]).length)+' titik pada dataset sebelumnya dan '+fmt(count)+' titik tambahan dari 4 file KML. Lapisan dipisah agar sumber data tetap dapat dibedakan.';
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
    const rows=await SafeRoadStore.getAllReports();
    rows.filter(r=>r.status==='Terverifikasi' && Number.isFinite(r.latitude) && Number.isFinite(r.longitude)).forEach(r=>{
      L.circleMarker([r.latitude,r.longitude],{radius:8,color:'#b77912',weight:2,fillColor:'#e8ad20',fillOpacity:.9})
       .bindPopup('<b>Jalan berlubang terverifikasi</b><br>'+esc(r.roadName)+'<br>'+esc(r.description)).addTo(state.potholeLayer);
    });
    if($('toggle-potholes').checked)state.potholeLayer.addTo(state.map);
  }
  async function renderMyReports(){
    const box=$('my-reports'),profile=state.profile||readProfile();
    if(!profile){box.innerHTML='<p class="muted-text">Isi nama pelapor pada formulir untuk membuat profil demo, lalu kirim laporan pertama.</p>';return;}
    const rows=(await SafeRoadStore.getAllReports()).filter(r=>r.userId===profile.id);
    box.innerHTML=rows.length?rows.map(r=>'<article class="report-item"><div><b>'+esc(r.roadName)+'</b><small>'+esc(r.id)+' · '+new Date(r.createdAt).toLocaleString('id-ID')+'<br>'+esc(r.description)+'</small>'+(r.adminNote?'<small>Catatan admin: '+esc(r.adminNote)+'</small>':'')+'</div>'+pill(r.status)+'</article>').join(''):'<p class="muted-text">Belum ada laporan dari profil ini pada browser.</p>';
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
  function readProfile(){try{return JSON.parse(localStorage.getItem('saferoad-demo-profile')||'null')}catch(_){return null}}
  function ensureProfile(){
    const name=$('reporter-name').value.trim()||'Pengguna SafeRoad',contact=$('reporter-contact').value.trim();
    let p=state.profile||readProfile();
    if(!p||p.name!==name||p.contact!==contact){p={id:'demo-'+(crypto.randomUUID?crypto.randomUUID():Date.now()),name,contact};localStorage.setItem('saferoad-demo-profile',JSON.stringify(p))}
    state.profile=p;$('profile-box').hidden=false;
    $('profile-box').innerHTML='<b>Profil demo:</b> '+esc(name)+(contact?' · '+esc(contact):'')+'<br><small>Hanya tersimpan di browser ini; belum merupakan akun online.</small>';
    return p;
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
    const reports=await SafeRoadStore.getAllReports();
    const near=reports.filter(r=>r.status==='Terverifikasi'&&distance(lat,lon,r.latitude,r.longitude)<=500);
    $('safety-note').textContent=near.length?'Perhatian: ada '+near.length+' laporan jalan berlubang terverifikasi dalam radius 500 meter. Kurangi kecepatan dan tetap waspada.':'Tidak ada laporan jalan berlubang terverifikasi dalam radius 500 meter dari lokasi GPS Anda. Layer historis tidak otomatis menjadi peringatan.';
    if(near.length)$('safety-note').parentElement.parentElement.classList.add('notice-active');
    else $('safety-note').parentElement.parentElement.classList.remove('notice-active');
  }
  async function reportSubmit(e){
    e.preventDefault();$('report-message').textContent='';
    if(!$('report-form').reportValidity())return;
    const lat=Number($('latitude').value),lon=Number($('longitude').value),file=$('report-photo').files[0];
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180){$('report-message').textContent='Koordinat tidak valid.';return}
    if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){$('report-message').textContent='Unggah foto JPG/PNG/WEBP maksimal 5 MB.';return}
    if(!$('report-consent').checked){$('report-message').textContent='Persetujuan wajib dicentang.';return}
    const profile=ensureProfile();
    try{
      const now=new Date().toISOString(),blob=file.slice(0,file.size,file.type);
      const report={id:'SR-'+Date.now().toString(36).toUpperCase(),userId:profile.id,reporterName:profile.name,reporterContact:profile.contact||'',roadName:$('road-name').value.trim(),description:$('report-description').value.trim(),latitude:lat,longitude:lon,photoBlob:blob,photoType:file.type,createdAt:now,status:'Menunggu Verifikasi',adminNote:'',history:[{status:'Menunggu Verifikasi',at:now,by:'Pengguna demo lokal',note:'Laporan disimpan pada browser ini.'}]};
      await SafeRoadStore.addReport(report);$('report-form').reset();$('profile-box').hidden=false;$('profile-box').innerHTML='<b>Profil demo:</b> '+esc(profile.name)+'<br><small>Hanya tersimpan di browser ini.</small>';
      $('photo-preview').classList.add('hidden');$('photo-preview').removeAttribute('src');$('coordinate-status').textContent='Koordinat belum diisi.';
      $('report-message').textContent='Laporan '+report.id+' berhasil disimpan pada browser ini. Status: Menunggu Verifikasi.';
      $('report-message').className='form-message success';await renderMyReports();await renderVerifiedReports();
    }catch(err){$('report-message').textContent='Gagal menyimpan laporan: '+err.message;$('report-message').className='form-message error'}
  }
  function setup(){
    $('mobile-menu').addEventListener('click',()=>{const open=$('main-nav').classList.toggle('open');$('mobile-menu').setAttribute('aria-expanded',String(open))});
    $('main-nav').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('main-nav').classList.remove('open')));
    $('toggle-accidents').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.accidentLayer.addTo(state.map):state.map.removeLayer(state.accidentLayer)});\n    $('toggle-kml-accidents').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.kmlAccidentLayer.addTo(state.map):state.map.removeLayer(state.kmlAccidentLayer)});\n    $('toggle-kml-accidents').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.kmlAccidentLayer.addTo(state.map):state.map.removeLayer(state.kmlAccidentLayer)});
    $('toggle-blacklink').addEventListener('change',e=>{if(!state.map)return;e.target.checked?state.blacklinkLayer.addTo(state.map):state.map.removeLayer(state.blacklinkLayer)});
    $('toggle-potholes').addEventListener('change',e=>{if(!state.map)return;e.target.checked?renderVerifiedReports():state.map.removeLayer(state.potholeLayer)});
    $('toggle-user').addEventListener('change',e=>{if(e.target.checked)return;if(state.userMarker)state.map.removeLayer(state.userMarker);if(state.accuracy)state.map.removeLayer(state.accuracy);state.userMarker=state.accuracy=null});
    $('get-location').addEventListener('click',()=>gps('get-location'));$('report-gps').addEventListener('click',()=>gps('report-gps'));
    $('pick-map-location').addEventListener('click',()=>{state.picking=!state.picking;$('pick-map-location').textContent=state.picking?'Klik lokasi pada peta…':'Pilih titik pada peta';$('coordinate-status').textContent=state.picking?'Klik titik yang diinginkan pada peta.':'Pemilihan titik dibatalkan.';$('map').classList.toggle('map-picking',state.picking);if(state.picking)$('peta').scrollIntoView({behavior:'smooth'})});
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
      $('stat-blackspot').textContent=fmt(bs.length);$('stat-blacklink').textContent=fmt(bl.length);
      $('map-status').textContent='Data dimuat: '+fmt(acc.features.length)+' titik dataset sebelumnya, '+fmt(kml.features.length)+' titik KML 2025, '+fmt(bs.length)+' Blackspot dan '+fmt(bl.length)+' Blacklink. Sedang memuat geometri 10 ruas Blacklink dari GeoPackage.';
      try { const geometry=await getJSON(files.blacklinkGeometry); renderBlacklinkGeometry(geometry); }
      catch(geometryError) { $('blacklink-layer-count').textContent='Geometri belum dapat dimuat'; $('map-status').textContent='Data tabel dan titik kecelakaan tersedia. Geometri Blacklink gagal dimuat: '+geometryError.message; }
    }catch(err){$('map-status').textContent=err.message+' Jalankan melalui HTTPS/localhost dan pastikan folder data tersedia.';$('analysis-body').innerHTML='<tr><td>Data belum dapat dimuat: '+esc(err.message)+'</td></tr>'}
    await renderMyReports();await renderVerifiedReports();
  }
  document.addEventListener('DOMContentLoaded',boot);
})();