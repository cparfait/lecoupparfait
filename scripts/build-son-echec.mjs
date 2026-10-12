#!/usr/bin/env node
/**
 * Le bruitage de l'échec, `apps/web/public/sounds/check.mp3`.
 *
 * Le fichier repris de lila était muet : 30 ms de silence (−84 dB). Le jeu de
 * sons « standard » de Lichess n'a pas d'échec, et ce fichier n'y tient que
 * la place. Une partie annonçait donc l'échec… sans rien faire entendre.
 *
 * On le compose ici plutôt que de l'emprunter à un autre jeu de sons : le
 * « clac » du coup ordinaire (`move.mp3`), puis une note tendue — deux notes à
 * un triton d'écart, do et fa dièse, attaque nette et extinction en 0,4 s.
 * Un échec se joue en déplaçant une pièce : on entend le coup, puis la menace.
 *
 * Outil d'atelier, à relancer seulement si l'on veut retoucher le son.
 * Il demande ffmpeg dans le PATH.
 *   node scripts/build-son-echec.mjs
 */

import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sons = join(racine, 'apps', 'web', 'public', 'sounds')

/** Do 6 et fa dièse 6 : un triton, l'intervalle le moins stable. */
const NOTES = [1046.5, 1480]
/** Après le choc du coup, pour qu'on entende les deux. */
const RETARD_MS = 55

const graphe = [
  // Le générateur de sinus sort à 1/8 d'amplitude : `volume` compense.
  `[1][2]amix=inputs=2:normalize=0,volume=1.8,afade=t=in:d=0.006,` +
    `aeval='val(0)*exp(-6*t)':c=same,adelay=${RETARD_MS}[note]`,
  `[0]aresample=44100[clac]`,
  `[clac][note]amix=inputs=2:normalize=0:duration=longest,` +
    `atrim=0:0.5,afade=t=out:st=0.4:d=0.1,alimiter=limit=0.95`,
].join(';')

execFileSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    join(sons, 'move.mp3'),
    ...NOTES.flatMap((f) => ['-f', 'lavfi', '-i', `sine=f=${f}:d=0.5:sample_rate=44100`]),
    '-filter_complex',
    graphe,
    '-ac',
    '1',
    '-ar',
    '44100',
    '-b:a',
    '64k',
    join(sons, 'check.mp3'),
  ],
  { stdio: 'inherit' },
)

console.log(`✓ ${join(sons, 'check.mp3')}`)
