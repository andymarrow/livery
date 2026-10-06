-- kits: public read. Artefacts are written once by the server (upsert off) and
--       never overwritten. No client upload policies exist.
-- screenshots: private. Served through short-lived signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('kits', 'kits', true, 10485760,
   array['application/zip', 'application/gzip', 'application/json', 'text/markdown']),
  ('screenshots', 'screenshots', false, 5242880, array['image/webp'])
on conflict (id) do nothing;
