-- Profiles table — linked to Supabase Auth users
-- Run this in Supabase Dashboard → SQL Editor

create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text not null,
  avatar_emoji  text not null default '🎲',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Allow users to read any profile, write only their own
alter table profiles enable row level security;

drop policy if exists "public read profiles"  on profiles;
drop policy if exists "users insert own profile" on profiles;
drop policy if exists "users update own profile" on profiles;

create policy "public read profiles"     on profiles for select using (true);
create policy "users insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated
  before update on profiles
  for each row execute function set_updated_at();

-- Link match_players to auth user (nullable — guest players have no user_id)
alter table match_players
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_mp_user on match_players(user_id);

-- Per-user stats function
create or replace function get_user_stats(p_user_id uuid)
returns table(
  matches_played  bigint,
  wins            bigint,
  win_rate        float,
  avg_tokens_finished float,
  best_streak     bigint
) language sql as $$
  select
    count(*) as matches_played,
    sum(mp.is_winner::int) as wins,
    case when count(*) > 0
      then sum(mp.is_winner::int)::float / count(*)
      else 0
    end as win_rate,
    coalesce(avg(mp.tokens_finished), 0) as avg_tokens_finished,
    coalesce(max(mp.tokens_finished), 0) as best_streak
  from match_players mp
  where mp.user_id = p_user_id;
$$;

-- User match history function
create or replace function get_user_matches(p_user_id uuid, row_limit int default 20)
returns table(
  match_id        text,
  room_code       text,
  winner_color    text,
  player_count    int,
  turn_count      int,
  duration_ms     int,
  created_at      bigint,
  my_color        text,
  is_winner       boolean,
  tokens_finished int
) language sql as $$
  select
    m.id, m.room_code, m.winner_color, m.player_count,
    m.turn_count, m.duration_ms, m.created_at,
    mp.color as my_color, mp.is_winner, mp.tokens_finished
  from matches m
  join match_players mp on mp.match_id = m.id
  where mp.user_id = p_user_id
  order by m.created_at desc
  limit row_limit;
$$;
