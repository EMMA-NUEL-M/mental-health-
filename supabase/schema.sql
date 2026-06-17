-- Peer support app schema. Run this in the Supabase SQL editor
-- (Project -> SQL Editor -> New query) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  role_preference text not null default 'seek_help'
    check (role_preference in ('seek_help', 'give_help', 'both')),
  is_online boolean not null default false,
  last_seen timestamptz not null default now(),
  is_suspended boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on profiles for select
  using (auth.uid() is not null);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ---------- topics (predefined list students pick from) ----------
create table topics (
  id serial primary key,
  name text unique not null
);

alter table topics enable row level security;
create policy "topics are readable by anyone signed in"
  on topics for select using (auth.uid() is not null);

insert into topics (name) values
  ('Exam stress'), ('Anxiety'), ('Depression'), ('Homesickness'),
  ('Time management'), ('Relationship issues'), ('Loneliness'),
  ('Faith & spirituality'), ('Financial stress'), ('Academic pressure'),
  ('Self-esteem'), ('Sleep issues');

-- ---------- user_topics (strengths / weaknesses, rated 1-5) ----------
create table user_topics (
  id serial primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  topic_id int references topics(id) not null,
  kind text not null check (kind in ('strength', 'weakness')),
  rating int not null check (rating between 1 and 5),
  unique (user_id, topic_id, kind)
);

alter table user_topics enable row level security;

create policy "user_topics readable by any signed-in user"
  on user_topics for select using (auth.uid() is not null);

create policy "users manage their own topics"
  on user_topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- matches ----------
create table matches (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid references profiles(id) not null,
  seeker_id uuid references profiles(id) not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'ended', 'rejected')),
  created_at timestamptz not null default now()
);

alter table matches enable row level security;

create policy "participants can read their match"
  on matches for select
  using (auth.uid() = helper_id or auth.uid() = seeker_id);

create policy "participants can update their match"
  on matches for update
  using (auth.uid() = helper_id or auth.uid() = seeker_id);

-- ---------- messages ----------
create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  content text not null,
  flagged_crisis boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "participants can read messages in their match"
  on messages for select
  using (
    exists (
      select 1 from matches m
      where m.id = messages.match_id
      and (m.helper_id = auth.uid() or m.seeker_id = auth.uid())
      and m.status = 'active'
    )
  );

create policy "participants can send messages in an active match"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from matches m
      where m.id = match_id
      and (m.helper_id = auth.uid() or m.seeker_id = auth.uid())
      and m.status = 'active'
    )
  );

-- ---------- reports ----------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) not null,
  reported_id uuid references profiles(id) not null,
  match_id uuid references matches(id),
  reason text,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "users can file a report"
  on reports for insert
  with check (auth.uid() = reporter_id);

create policy "users can see reports they filed"
  on reports for select
  using (auth.uid() = reporter_id);

-- NOTE on the auto-suspend trigger below: this matches the spec you
-- described (suspend after 3 distinct reporters), implemented as a
-- database trigger so it can't be bypassed from the client. The
-- tradeoff is that it can be gamed by coordinated false reports.
-- A safer middle ground, if you want it later, is to flip
-- `auto_suspend` to false and instead query `reports where reviewed =
-- false` from the Supabase dashboard as a manual moderation queue.
create or replace function check_suspend_after_reports()
returns trigger as $$
declare
  reporter_count int;
  auto_suspend boolean := true; -- flip to false to require manual review instead
begin
  select count(distinct reporter_id) into reporter_count
  from reports
  where reported_id = new.reported_id;

  if auto_suspend and reporter_count >= 3 then
    update profiles set is_suspended = true where id = new.reported_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_check_suspend
after insert on reports
for each row execute function check_suspend_after_reports();

-- ---------- matching function ----------
-- Tries to find an available, non-suspended helper who isn't already
-- in a pending/active match, and opens a pending match for the seeker
-- to be accepted. Returns null if nobody is available right now.
create or replace function request_match(seeker uuid)
returns uuid as $$
declare
  chosen_helper uuid;
  new_match_id uuid;
begin
  select p.id into chosen_helper
  from profiles p
  where p.id <> seeker
    and p.is_suspended = false
    and p.role_preference in ('give_help', 'both')
    and p.is_online = true
    and not exists (
      select 1 from matches m
      where (m.helper_id = p.id or m.seeker_id = p.id)
      and m.status in ('pending', 'active')
    )
  order by random()
  limit 1;

  if chosen_helper is null then
    return null;
  end if;

  insert into matches (helper_id, seeker_id, status)
  values (chosen_helper, seeker, 'pending')
  returning id into new_match_id;

  return new_match_id;
end;
$$ language plpgsql security definer;

-- Allow any signed-in user to call the matching function.
grant execute on function request_match(uuid) to authenticated;
