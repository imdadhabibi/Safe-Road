-- SafeRoad: guest tracking tokens and authenticated reporter history
alter table public.reports
  add column if not exists reporter_user_id uuid references auth.users(id) on delete set null,
  add column if not exists tracking_token_hash text;
create index if not exists reports_reporter_user_created_idx
  on public.reports (reporter_user_id, created_at desc)
  where reporter_user_id is not null;
create unique index if not exists reports_tracking_token_hash_uidx
  on public.reports (tracking_token_hash) where tracking_token_hash is not null;
grant insert (id, reporter_name, reporter_contact, road_name, description, latitude, longitude, photo_path, photo_type, reporter_user_id, tracking_token_hash)
on public.reports to anon, authenticated;
grant select (id, road_name, status, created_at, updated_at, verified_at)
on public.reports to authenticated;
drop policy if exists "SafeRoad public submit" on public.reports;
create policy "SafeRoad public submit" on public.reports for insert to anon
with check (reporter_user_id is null and tracking_token_hash is not null and status='Menunggu Verifikasi' and admin_note is null and verified_by is null and verified_at is null and history='[]'::jsonb);
drop policy if exists "SafeRoad registered user submit" on public.reports;
create policy "SafeRoad registered user submit" on public.reports for insert to authenticated
with check (reporter_user_id=(select auth.uid()) and tracking_token_hash is not null and status='Menunggu Verifikasi' and admin_note is null and verified_by is null and verified_at is null and history='[]'::jsonb);
drop policy if exists "SafeRoad user read own reports" on public.reports;
create policy "SafeRoad user read own reports" on public.reports for select to authenticated
using (reporter_user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "SafeRoad public read verified only" on public.reports;
create policy "SafeRoad public read verified only" on public.reports for select to anon using (status='Terverifikasi');
create or replace function public.get_report_tracking(p_token text)
returns table(report_id text,road_name text,status text,created_at timestamptz,updated_at timestamptz,verified_at timestamptz)
language sql security definer set search_path=pg_catalog,public
as $$
 select r.id,r.road_name,r.status,r.created_at,r.updated_at,r.verified_at
 from public.reports r
 where p_token is not null and length(p_token) between 24 and 100
 and r.tracking_token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
 limit 1;
$$;
revoke all on function public.get_report_tracking(text) from public;
grant execute on function public.get_report_tracking(text) to anon,authenticated;
drop policy if exists "SafeRoad public upload report photo" on storage.objects;
create policy "SafeRoad public upload report photo" on storage.objects for insert to anon
with check(bucket_id='report-photos' and (storage.foldername(name))[1]='incoming' and lower(storage.extension(name)) in ('jpg','jpeg','png','webp'));
drop policy if exists "SafeRoad registered user upload report photo" on storage.objects;
create policy "SafeRoad registered user upload report photo" on storage.objects for insert to authenticated
with check(bucket_id='report-photos' and (storage.foldername(name))[1]='incoming' and lower(storage.extension(name)) in ('jpg','jpeg','png','webp'));
