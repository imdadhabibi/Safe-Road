-- SafeRoad V2: database, RLS, and private photo storage
-- Run once in Supabase Dashboard > SQL Editor.
-- Public users may submit reports and see only sanitized, verified hazard points.
-- Only users whose auth.users.raw_app_meta_data.role is "admin" may see/manage the full queue.

create table if not exists public.reports (
  id text primary key,
  reporter_name text,
  reporter_contact text,
  road_name text not null,
  description text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  photo_path text not null check (photo_path like 'incoming/%'),
  photo_type text not null check (photo_type in ('image/jpeg','image/png','image/webp')),
  status text not null default 'Menunggu Verifikasi'
    check (status in ('Menunggu Verifikasi','Terverifikasi','Perlu Pemeriksaan Lebih Lanjut','Ditolak','Sudah Ditangani')),
  admin_note text,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null
);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Public INSERT is column-limited. Status/admin fields use DB defaults.
grant insert (id, reporter_name, reporter_contact, road_name, description,
              latitude, longitude, photo_path, photo_type)
on public.reports to anon;

-- Public can read only minimum fields of already verified map points.
grant select (id, road_name, description, latitude, longitude, created_at)
on public.reports to anon;

-- Authenticated users get rows/operations only when app_metadata.role = admin (RLS).
grant select on public.reports to authenticated;
grant update (status, admin_note, history, updated_at, verified_at, verified_by)
on public.reports to authenticated;
grant delete on public.reports to authenticated;

drop policy if exists "SafeRoad public submit" on public.reports;
create policy "SafeRoad public submit"
on public.reports for insert to anon
with check (
  status = 'Menunggu Verifikasi'
  and admin_note is null
  and verified_by is null
  and verified_at is null
  and history = '[]'::jsonb
);

drop policy if exists "SafeRoad public read verified only" on public.reports;
create policy "SafeRoad public read verified only"
on public.reports for select to anon
using (status = 'Terverifikasi');

drop policy if exists "SafeRoad admin read all" on public.reports;
create policy "SafeRoad admin read all"
on public.reports for select to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "SafeRoad admin update" on public.reports;
create policy "SafeRoad admin update"
on public.reports for update to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "SafeRoad admin delete" on public.reports;
create policy "SafeRoad admin delete"
on public.reports for delete to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Private photo bucket: public can upload, admin can read/delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "SafeRoad public upload report photo" on storage.objects;
create policy "SafeRoad public upload report photo"
on storage.objects for insert to anon
with check (
  bucket_id = 'report-photos'
  and (storage.foldername(name))[1] = 'incoming'
  and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);

drop policy if exists "SafeRoad admin view report photos" on storage.objects;
create policy "SafeRoad admin view report photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'report-photos'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "SafeRoad admin delete report photos" on storage.objects;
create policy "SafeRoad admin delete report photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'report-photos'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- After creating the admin account in Authentication > Users, run separately:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- where email = 'admin@contoh.com';
-- Then sign out/in again to get a fresh JWT.
