create table if not exists public.family_group_invitations (
  id uuid primary key default gen_random_uuid(),
  family_group_id uuid not null references public.family_groups(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (family_group_id, invitee_user_id, status)
);

create index if not exists family_group_invitations_invitee_idx
  on public.family_group_invitations (invitee_user_id, status);

create index if not exists family_group_invitations_group_idx
  on public.family_group_invitations (family_group_id, status);

alter table public.family_group_invitations enable row level security;

create policy "Users can view their family invitations"
  on public.family_group_invitations for select
  using (auth.uid() = invitee_user_id or auth.uid() = inviter_user_id);

create policy "Invitees can respond to family invitations"
  on public.family_group_invitations for update
  using (auth.uid() = invitee_user_id)
  with check (auth.uid() = invitee_user_id);
