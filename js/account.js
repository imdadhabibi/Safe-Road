(() => {
'use strict';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='login';
function setMode(next){mode=next;$('tab-login').classList.toggle('active',mode==='login');$('tab-register').classList.toggle('active',mode==='register');$('auth-submit').textContent=mode==='login'?'Login':'Buat akun';$('password').autocomplete=mode==='login'?'current-password':'new-password';$('auth-message').textContent=''}
async function showSession(){
 const {data,error}=await window.safeRoadSupabase.auth.getSession();if(error)throw error;
 const user=data.session?.user;
 $('auth-panel').classList.toggle('hidden',!!user);$('signed-panel').classList.toggle('hidden',!user);
 if(!user)return;
 $('signed-email').textContent=user.email||'Akun SafeRoad';
 const rows=await SafeRoadStore.getMyReports();
 $('account-reports').innerHTML=rows.length?rows.map(r=>'<article class="account-report"><div><b>'+esc(r.road_name)+'</b><small>'+esc(r.id)+' · '+new Date(r.created_at).toLocaleString('id-ID')+'</small></div><span class="status-pill '+(r.status==='Terverifikasi'?'status-verified':r.status==='Ditolak'?'status-rejected':r.status==='Sudah Ditangani'?'status-done':'status-pending')+'">'+esc(r.status)+'</span></article>').join(''):'<p>Belum ada laporan yang terhubung ke akun ini. Laporan berikutnya yang dikirim saat login akan otomatis masuk ke riwayat.</p>';
}
document.addEventListener('DOMContentLoaded',async()=>{
 if(!window.safeRoadSupabaseConfigured){$('auth-message').textContent='Supabase belum terkonfigurasi.';return}
 $('tab-login').addEventListener('click',()=>setMode('login'));$('tab-register').addEventListener('click',()=>setMode('register'));
 $('auth-form').addEventListener('submit',async e=>{
  e.preventDefault();$('auth-submit').disabled=true;$('auth-message').textContent='Memproses…';
  try{
   const email=$('email').value.trim(),password=$('password').value;
   if(mode==='register'){
    const {data,error}=await window.safeRoadSupabase.auth.signUp({email,password});if(error)throw error;
    if(data.session){$('auth-message').textContent='Akun berhasil dibuat dan Anda sudah login.';await showSession()}
    else $('auth-message').textContent='Pendaftaran diterima. Periksa email untuk konfirmasi, lalu login ke SafeRoad.';
   }else{
    const {error}=await window.safeRoadSupabase.auth.signInWithPassword({email,password});if(error)throw error;
    await showSession();
   }
  }catch(err){$('auth-message').textContent=err.message||'Proses akun gagal.'}
  finally{$('auth-submit').disabled=false}
 });
 $('logout').addEventListener('click',async()=>{await window.safeRoadSupabase.auth.signOut();await showSession()});
 window.safeRoadSupabase.auth.onAuthStateChange(()=>{setTimeout(()=>showSession().catch(e=>$('account-reports').textContent=e.message),0)});
 await showSession();
});
})();