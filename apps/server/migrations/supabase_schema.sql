-- Run this in Supabase Dashboard → SQL Editor

create table if not exists matches (
  id           text primary key,
  room_code    text not null,
  winner_color text not null,
  player_count int  not null,
  turn_count   int  not null,
  duration_ms  int  not null,
  created_at   bigint not null
);

create table if not exists match_players (
  match_id        text not null references matches(id) on delete cascade,
  player_name     text not null,
  color           text not null,
  seat_index      int  not null,
  is_winner       boolean not null default false,
  tokens_finished int  not null default 0
);

create index if not exists idx_matches_created on matches(created_at desc);
create index if not exists idx_mp_match        on match_players(match_id);
create index if not exists idx_mp_name         on match_players(player_name);

-- Leaderboard function
create or replace function get_leaderboard(row_limit int default 10)
returns table(
  player_name     text,
  matches_played  bigint,
  wins            bigint,
  win_rate        float,
  avg_tokens_finished float
) language sql as $$
  select
    mp.player_name,
    count(*)                        as matches_played,
    sum(mp.is_winner::int)          as wins,
    sum(mp.is_winner::int)::float / count(*) as win_rate,
    avg(mp.tokens_finished)         as avg_tokens_finished
  from match_players mp
  group by mp.player_name
  having count(*) >= 3
  order by wins desc, avg_tokens_finished desc
  limit row_limit;
$$;

-- Player stats function
create or replace function get_player_stats(p_name text)
returns table(
  player_name     text,
  matches_played  bigint,
  wins            bigint,
  win_rate        float,
  avg_tokens_finished float
) language sql as $$
  select
    mp.player_name,
    count(*)                        as matches_played,
    sum(mp.is_winner::int)          as wins,
    sum(mp.is_winner::int)::float / count(*) as win_rate,
    avg(mp.tokens_finished)         as avg_tokens_finished
  from match_players mp
  where mp.player_name = p_name
  group by mp.player_name;
$$;

-- Row Level Security (service key bypasses this, but good practice)
alter table matches      enable row level security;
alter table match_players enable row level security;

-- Allow public read (leaderboard visible to all)
drop policy if exists "public read matches"       on matches;
drop policy if exists "public read match_players" on match_players;
create policy "public read matches"       on matches       for select using (true);
create policy "public read match_players" on match_players for select using (true);





