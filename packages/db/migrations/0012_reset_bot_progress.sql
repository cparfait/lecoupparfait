-- La progression contre l'ordinateur repart de zéro.
--
-- `0011_shorter_ladder` reportait chaque ancien rang sur le survivant le plus
-- proche. C'était le choix prudent, et il avait un défaut : « plus haut niveau
-- battu = 3 » ne désignait plus la même chose qu'avant, et le joueur n'avait
-- aucun moyen de le savoir. On préfère une remise à zéro franche, qu'on peut
-- annoncer, à un report silencieux dont personne ne peut vérifier le sens.
--
-- ── Ce qui est effacé ────────────────────────────────────────────────────────
--
--   `bot_progress`   le plus haut niveau battu, le nombre de tentatives et de
--                    victoires contre l'ordinateur. La ligne est conservée et
--                    remise à ses valeurs par défaut, plutôt que supprimée :
--                    le code lit cette ligne sans toujours la créer.
--   `rated_intents`  les parties classées annoncées mais pas encore jouées.
--                    Elles portent un niveau d'adversaire qui n'existe peut-être
--                    plus ; le joueur n'a qu'à réannoncer.
--
-- ── Ce qui n'est PAS effacé, et pourquoi ─────────────────────────────────────
--
--   `games`          l'historique des parties. Elles ont été jouées, gagnées ou
--                    perdues ; leur `bot_level` a été reporté par la migration
--                    précédente. Réécrire le passé d'un joueur pour arranger une
--                    table de réglages serait disproportionné.
--   `ratings`        les classements Glicko. Ils ne dépendent pas du barème des
--                    bots : ils viennent aussi des parties entre humains, et les
--                    remettre à zéro punirait des joueurs pour un changement qui
--                    ne les concerne pas.
--   `career_progress` le mode carrière choisit ses adversaires par
--                    **personnalité**, pas par palier — voir l'en-tête de
--                    `packages/core/src/carriere.ts`. Il n'est pas concerné.
--   `active_games`   les parties en cours. Leur niveau a été reporté par la
--                    migration précédente ; interrompre une partie qu'on est en
--                    train de jouer serait la pire façon d'annoncer un
--                    changement d'échelle.
--
-- Irréversible : aucune de ces valeurs n'est reconstituable à partir du reste.

UPDATE bot_progress
   SET defeated = 0,
       attempts = 0,
       wins = 0,
       updated_at = now();
--> statement-breakpoint
DELETE FROM rated_intents;
