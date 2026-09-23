-- Safe initial reference data. No admin user is created here because Auth user IDs
-- must be linked to the profiles table after the owner creates the account.

insert into public.exam_levels (slug, name_en, name_si, sort_order)
values ('ordinary-level', 'Ordinary Level', 'සාමාන්‍ය පෙරීමිය', 10)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_si = excluded.name_si,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.subjects (slug, name_en, name_si, sort_order)
values ('mathematics', 'Mathematics', 'ගණිතය', 10)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_si = excluded.name_si,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.site_settings (
  id,
  site_name,
  tagline,
  whatsapp_number,
  phone_number,
  contact_email,
  youtube_url,
  tiktok_url,
  facebook_url
)
values (
  true,
  'Siyana Maths',
  'O/L Mathematics past papers, solutions, and marking schemes.',
  null,
  null,
  null,
  null,
  null,
  null
)
on conflict (id) do update set
  site_name = excluded.site_name,
  tagline = excluded.tagline;
