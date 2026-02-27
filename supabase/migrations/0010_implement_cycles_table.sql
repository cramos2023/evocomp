-- Create cycles table
create table if not exists public.cycles (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    name text not null,
    status text not null check (status in ('planned', 'active', 'completed')),
    start_date date not null,
    end_date date not null,
    budget_total decimal(15,2) default 0,
    currency text default 'USD',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.cycles enable row level security;

-- RLS Policies
create policy "Users can view cycles from their tenant"
    on public.cycles for select
    using (tenant_id = (select tenant_id from public.user_profiles where id = auth.uid()));

create policy "Users can insert cycles into their tenant"
    on public.cycles for insert
    with check (tenant_id = (select tenant_id from public.user_profiles where id = auth.uid()));

create policy "Users can update cycles in their tenant"
    on public.cycles for update
    using (tenant_id = (select tenant_id from public.user_profiles where id = auth.uid()));

-- Update trigger for updated_at
create trigger handle_cycles_updated_at
    before update on public.cycles
    for each row
    execute function public.handle_updated_at();

-- Comment for PostgREST
comment on table public.cycles is 'Compensation cycles for salary reviews and budget planning.';
