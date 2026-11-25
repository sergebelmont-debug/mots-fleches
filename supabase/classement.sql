-- ════════════════════════════════════════════════════════════════════════
-- CLASSEMENT — Les Mots Fléchés
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run.
-- Peut être relancé sans risque (ne supprime aucune donnée).
--
-- Réutilise les joueurs du classement de Bubble Nostalgia (table players,
-- fonction set_pseudo) : un seul pseudo pour tous les jeux de Serge Belmont.
-- Ce script suppose donc que celui de Bubble Nostalgia a déjà été lancé.
--
-- Classement : total d'étoiles, puis nombre de grilles terminées, puis temps
-- total le plus court (sur les meilleurs temps de chaque grille).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.mf_scores (
  player_id   uuid not null references public.players(id) on delete cascade,
  grid        text not null,
  stars       int  not null,
  seconds     int,
  updated_at  timestamptz not null default now(),
  primary key (player_id, grid)
);

alter table public.mf_scores enable row level security;
revoke all on public.mf_scores from anon, authenticated;

-- ── Envoyer le meilleur résultat d'une grille ────────────────────────────
-- Grilles : « 001 » à « 999 » (parcours) et « B01 » à « B99 » (univers Serge Belmont).
create or replace function public.mf_submit(p_id uuid, p_token text, p_grid text, p_stars int, p_seconds int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_prev timestamptz;
  v_num  int;
  v_prefix text;
begin
  perform bn_check_player(p_id, p_token);
  if p_grid !~ '^(B[0-9]{2}|[0-9]{3})$' then raise exception 'grille_invalide'; end if;
  if p_stars < 1 or p_stars > 3 then raise exception 'etoiles_invalides'; end if;
  -- Un temps est facultatif ; s'il est donné, il doit être crédible (20 s à 24 h).
  if p_seconds is not null and (p_seconds < 20 or p_seconds > 86400) then raise exception 'temps_invalide'; end if;

  -- Progression cohérente : une grille ne compte que si la précédente est terminée.
  v_prefix := case when left(p_grid, 1) = 'B' then 'B' else '' end;
  v_num := substring(p_grid from '[0-9]+$')::int;
  if v_num > 1 and not exists (
    select 1 from mf_scores where player_id = p_id
      and grid = v_prefix || lpad((v_num - 1)::text, case when v_prefix = 'B' then 2 else 3 end, '0')
  ) then
    raise exception 'grille_precedente_manquante';
  end if;

  -- Anti-rafale : un envoi par grille toutes les 5 secondes au plus.
  select updated_at into v_prev from mf_scores where player_id = p_id and grid = p_grid;
  if v_prev is not null and v_prev > now() - interval '5 seconds' then raise exception 'trop_rapide'; end if;

  insert into mf_scores (player_id, grid, stars, seconds) values (p_id, p_grid, p_stars, p_seconds)
  on conflict (player_id, grid) do update
    set stars = greatest(mf_scores.stars, excluded.stars),
        seconds = case
          when mf_scores.seconds is null then excluded.seconds
          when excluded.seconds is null then mf_scores.seconds
          else least(mf_scores.seconds, excluded.seconds) end,
        updated_at = now();
  return (select stars from mf_scores where player_id = p_id and grid = p_grid);
end $$;

-- ── Lire le classement ───────────────────────────────────────────────────
create or replace function public.mf_leaderboard(p_limit int default 50)
returns table (rank bigint, pseudo text, stars bigint, grids bigint, seconds bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select * from (
    select rank() over (order by sum(s.stars) desc, count(*) desc, coalesce(sum(s.seconds), 0) asc) as rank,
           p.pseudo, sum(s.stars) as stars, count(*) as grids, coalesce(sum(s.seconds), 0) as seconds, false as is_me
    from mf_scores s join players p on p.id = s.player_id
    group by p.id, p.pseudo
  ) t
  order by rank, pseudo
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.mf_player_rank(p_id uuid)
returns table (rank bigint, pseudo text, stars bigint, grids bigint, seconds bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select * from (
    select rank() over (order by sum(s.stars) desc, count(*) desc, coalesce(sum(s.seconds), 0) asc) as rank,
           p.pseudo, sum(s.stars) as stars, count(*) as grids, coalesce(sum(s.seconds), 0) as seconds, (p.id = p_id) as is_me
    from mf_scores s join players p on p.id = s.player_id
    group by p.id, p.pseudo
  ) t
  where is_me;
$$;

revoke all on function public.mf_submit(uuid, text, text, int, int) from public;
revoke all on function public.mf_leaderboard(int) from public;
revoke all on function public.mf_player_rank(uuid) from public;
grant execute on function public.mf_submit(uuid, text, text, int, int) to anon;
grant execute on function public.mf_leaderboard(int) to anon;
grant execute on function public.mf_player_rank(uuid) to anon;
