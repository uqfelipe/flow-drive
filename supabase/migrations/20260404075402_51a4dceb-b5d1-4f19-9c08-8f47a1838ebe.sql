create table public.customer_files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  file_type text not null default 'file',
  file_url text not null,
  file_name text default '',
  variable_name text default '',
  created_at timestamptz not null default now()
);

alter table public.customer_files enable row level security;

create policy "Allow all access to customer_files" on public.customer_files for all to public using (true) with check (true);