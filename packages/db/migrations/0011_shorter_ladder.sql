-- L'échelle des adversaires passe de vingt-sept échelons à quinze.
--
-- Les rangs sont **stockés**, pas recalculés — voir `0010_shifted_ladder`, qui
-- a déjà affronté ce problème et en a dressé la liste : `bot_progress.defeated`
-- retient le plus haut niveau battu, `games.bot_level` l'adversaire d'une
-- partie jouée, `rated_intents.bot_level` celui d'une partie classée annoncée,
-- et `active_games.state->level` celui d'une partie **en cours**. Sans ce
-- remappage, « j'ai battu le niveau 12 » désignerait un autre adversaire du
-- jour au lendemain.
--
-- Ce n'est pas un décalage uniforme cette fois mais une projection : douze
-- échelons disparaissent, et chaque ancien rang est reporté sur le survivant
-- dont l'Elo est le plus proche. Plusieurs anciens rangs peuvent donc atterrir
-- sur le même nouveau — c'est le principe d'une échelle qu'on raccourcit.
--
-- Un cas mérite d'être regardé en face : les **cinq** premiers rangs se
-- reportent tous sur le nouveau premier. Les quatre bots les plus faibles ne
-- disparaissent pas par économie mais parce que leur force, mesurée, tombe
-- sous le plancher de l'échelle Elo — voir l'en-tête de `LEVEL_TABLE`. Un
-- joueur qui avait battu l'ancien niveau 3 se retrouve donc crédité d'un
-- adversaire plus fort que celui qu'il avait vaincu. C'est le seul endroit où
-- cette migration avantage le joueur, et c'est préférable à l'inverse : lui
-- retirer une victoire acquise serait pire que lui en offrir une.
--
--     ancien → nouveau        ancien → nouveau        ancien → nouveau
--   1..5 → 1  (les quatre     11, 12 → 6              20, 21 → 11
--              plus faibles   13, 14 → 7                  22 → 12
--              disparaissent) 15, 16 → 8              23, 24 → 13
--        6 → 2                17, 18 → 9                  25 → 14
--     7, 8 → 3                    19 → 10             26, 27 → 15
--        9 → 4
--       10 → 5
--
-- Écrite à la main : drizzle-kit compare des schémas, il ne devine pas qu'une
-- valeur a changé de sens.

CREATE OR REPLACE FUNCTION pg_temp.echelon_reduit(ancien int) RETURNS int AS $$
  SELECT CASE ancien
    WHEN 1 THEN 1 WHEN 2 THEN 1 WHEN 3 THEN 1 WHEN 4 THEN 1 WHEN 5 THEN 1
    WHEN 6 THEN 2 WHEN 7 THEN 3 WHEN 8 THEN 3 WHEN 9 THEN 4 WHEN 10 THEN 5
    WHEN 11 THEN 6 WHEN 12 THEN 6 WHEN 13 THEN 7 WHEN 14 THEN 7 WHEN 15 THEN 8
    WHEN 16 THEN 8 WHEN 17 THEN 9 WHEN 18 THEN 9 WHEN 19 THEN 10 WHEN 20 THEN 11
    WHEN 21 THEN 11 WHEN 22 THEN 12 WHEN 23 THEN 13 WHEN 24 THEN 13
    WHEN 25 THEN 14 WHEN 26 THEN 15 WHEN 27 THEN 15
    -- Au-delà de 27 : rien n'a jamais écrit ça, mais on borne plutôt que de
    -- rendre NULL sur une colonne qui n'en veut pas.
    ELSE LEAST(GREATEST(ancien, 1), 15)
  END;
$$ LANGUAGE SQL IMMUTABLE;
--> statement-breakpoint
-- `defeated` vaut 0 quand aucun niveau n'a été battu : cette valeur-là n'est
-- pas un rang et ne se remappe pas.
UPDATE bot_progress SET defeated = pg_temp.echelon_reduit(defeated) WHERE defeated >= 1;
--> statement-breakpoint
UPDATE games SET bot_level = pg_temp.echelon_reduit(bot_level) WHERE bot_level IS NOT NULL;
--> statement-breakpoint
UPDATE rated_intents SET bot_level = pg_temp.echelon_reduit(bot_level);
--> statement-breakpoint
-- Les parties en cours gardent leur niveau dans un JSON : une partie reprise
-- après la migration doit retrouver un adversaire de force comparable.
UPDATE active_games
   SET state = jsonb_set(state, '{level}', to_jsonb(pg_temp.echelon_reduit((state ->> 'level')::int)))
 WHERE state ? 'level'
   AND (state ->> 'level') ~ '^[0-9]+$';
