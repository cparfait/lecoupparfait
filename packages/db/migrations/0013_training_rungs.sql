-- Trois échelons d'entraînement reviennent sous le premier, aux rangs 1 à 3.
--
-- Depuis la montée en Stockfish 19, le plus faible adversaire battait les
-- débutants : le réseau avait rendu les bots du bas plus forts, puis
-- `0011_shorter_ladder` avait retiré les quatre premiers échelons. Trois
-- reviennent, avec des étiquettes posées sur le plancher des plateformes en
-- ligne — voir l'en-tête de `LEVEL_TABLE` dans `packages/core/src/bots.ts`.
--
-- Les rangs sont **stockés**, pas recalculés : `bot_progress.defeated` retient
-- le plus haut niveau battu, `games.bot_level` l'adversaire d'une partie jouée,
-- `rated_intents.bot_level` celui d'une partie classée annoncée, et
-- `active_games.state->level` celui d'une partie en cours. Un décalage uniforme
-- de trois, comme `0010_shifted_ladder` : chaque rang désigne après le même
-- adversaire qu'avant.
--
-- Écrite à la main : drizzle-kit compare des schémas, il ne devine pas qu'une
-- valeur a changé de sens.

-- `defeated` vaut 0 quand aucun niveau n'a été battu : cette valeur-là n'est
-- pas un rang et ne se décale pas.
UPDATE bot_progress SET defeated = defeated + 3 WHERE defeated >= 1;
--> statement-breakpoint
UPDATE games SET bot_level = bot_level + 3 WHERE bot_level IS NOT NULL;
--> statement-breakpoint
UPDATE rated_intents SET bot_level = bot_level + 3;
--> statement-breakpoint
-- Les parties en cours gardent leur niveau dans un JSON : une partie reprise
-- après la migration doit retrouver l'adversaire contre lequel elle a commencé.
UPDATE active_games
   SET state = jsonb_set(state, '{level}', to_jsonb(((state ->> 'level')::int) + 3))
 WHERE state ? 'level'
   AND (state ->> 'level') ~ '^[0-9]+$';
