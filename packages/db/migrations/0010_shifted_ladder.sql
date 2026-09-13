-- Deux paliers d'adversaire insérés entre 1000 et 1320 Elo, aux rangs 8 et 9.
--
-- Les rangs sont **stockés**, pas recalculés : `bot_progress.defeated` retient
-- le plus haut niveau battu, `games.bot_level` l'adversaire d'une partie jouée,
-- `active_games.state->level` celui d'une partie en cours, `rated_intents` celui
-- d'une partie classée annoncée. Sans ce décalage, « j'ai battu le niveau 12 »
-- désignerait un autre adversaire du jour au lendemain, et la carrière de
-- chacun se retrouverait plus facile de deux crans.
--
-- Écrite à la main : drizzle-kit compare des schémas, il ne devine pas qu'une
-- valeur a changé de sens.

UPDATE bot_progress SET defeated = defeated + 2 WHERE defeated >= 8;
--> statement-breakpoint
UPDATE games SET bot_level = bot_level + 2 WHERE bot_level >= 8;
--> statement-breakpoint
UPDATE rated_intents SET bot_level = bot_level + 2 WHERE bot_level >= 8;
--> statement-breakpoint
-- Les parties en cours gardent leur niveau dans un JSON : une partie reprise
-- après la migration doit retrouver l'adversaire contre lequel elle a commencé.
UPDATE active_games
   SET state = jsonb_set(state, '{level}', to_jsonb(((state ->> 'level')::int) + 2))
 WHERE state ? 'level'
   AND (state ->> 'level') ~ '^[0-9]+$'
   AND (state ->> 'level')::int >= 8;
