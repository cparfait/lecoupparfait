-- Deux échelons s'intercalent sous 1000 : 430 entre 320 et 630, 770 entre 630
-- et 980. Voir l'en-tête de `LEVEL_TABLE` dans `packages/core/src/bots.ts`.
--
-- Les rangs sont **stockés**, comme pour `0013_training_rungs` :
-- `bot_progress.defeated`, `games.bot_level`, `rated_intents.bot_level` et
-- `active_games.state->level`. Le décalage n'est plus uniforme : les rangs 1 à
-- 4 ne bougent pas, l'ancien 5 (630) devient 6, et tout ce qui valait 6 ou plus
-- avance de deux. Chaque rang désigne après le même adversaire qu'avant.
--
-- Écrite à la main : drizzle-kit compare des schémas, il ne devine pas qu'une
-- valeur a changé de sens.

-- `defeated` vaut 0 quand aucun niveau n'a été battu : cette valeur-là n'est
-- pas un rang, et la condition `>= 5` la laisse en paix.
UPDATE bot_progress
   SET defeated = defeated + CASE WHEN defeated >= 6 THEN 2 ELSE 1 END
 WHERE defeated >= 5;
--> statement-breakpoint
UPDATE games
   SET bot_level = bot_level + CASE WHEN bot_level >= 6 THEN 2 ELSE 1 END
 WHERE bot_level >= 5;
--> statement-breakpoint
UPDATE rated_intents
   SET bot_level = bot_level + CASE WHEN bot_level >= 6 THEN 2 ELSE 1 END
 WHERE bot_level >= 5;
--> statement-breakpoint
-- Les parties en cours gardent leur niveau dans un JSON : une partie reprise
-- après la migration doit retrouver l'adversaire contre lequel elle a commencé.
UPDATE active_games
   SET state = jsonb_set(
         state,
         '{level}',
         to_jsonb(
           ((state ->> 'level')::int)
           + CASE WHEN (state ->> 'level')::int >= 6 THEN 2 ELSE 1 END
         )
       )
 WHERE state ? 'level'
   AND (state ->> 'level') ~ '^[0-9]+$'
   AND (state ->> 'level')::int >= 5;
