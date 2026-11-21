(() => {
'use strict';
document.addEventListener('DOMContentLoaded',async()=>{
 const logout=document.getElementById('admin-logout');
 try{
  if(!window.safeRoadSupabaseConfigured)throw new Error('Supabase tidak tersedia.');
  const {data,error}=await safeRoadSupabase.auth.getUser();if(error)throw error;
  if(!data.user||data.user.app_metadata?.role!=='admin'){location.replace('login.html');return;}
  if(logout)logout.addEventListener('click',async()=>{await safeRoadSupabase.auth.signOut();location.replace('login.html')});
 }catch(_){location.replace('login.html')}
});
})();