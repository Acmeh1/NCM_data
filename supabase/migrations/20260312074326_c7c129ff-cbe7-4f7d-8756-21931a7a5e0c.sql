insert into storage.buckets (id, name, public) values ('database-backups', 'database-backups', false) on conflict (id) do nothing;

create policy "Service role full access to backups" on storage.objects for all using (bucket_id = 'database-backups') with check (bucket_id = 'database-backups');