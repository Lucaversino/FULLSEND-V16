begin;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists profile_color text not null default '#ff2546';
alter table public.profiles drop constraint if exists profiles_color_hex;
alter table public.profiles add constraint profiles_color_hex check(profile_color ~ '^#[0-9a-fA-F]{6}$');
notify pgrst,'reload schema';
commit;
