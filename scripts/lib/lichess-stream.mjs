/**
 * Lecture des jeux de données Lichess.
 *
 * Ils sont publiés en **pzstd** (zstd parallèle), un format que le décodeur
 * intégré à Node refuse en l'état. Le contournement vivait dans le script
 * d'import des puzzles ; il sert maintenant aussi aux statistiques
 * d'ouvertures, et le recopier aurait garanti que les deux copies divergent.
 */

import { Transform } from 'node:stream'

/**
 * Démêle le format pzstd.
 *
 * Le fichier de Lichess est compressé avec **pzstd** (zstd parallèle), qui
 * produit une structure particulière : chaque frame compressée est précédée
 * d'une petite *frame escamotable* de quatre octets contenant la taille de la
 * frame qui suit. La norme zstd autorise ces frames et impose aux décodeurs de
 * les ignorer — mais celui intégré à Node s'arrête dessus avec « Unknown frame
 * descriptor ».
 *
 * On les retire donc soi-même. Comme chaque marqueur annonce la taille exacte
 * de la frame suivante, il suffit de laisser passer ce nombre d'octets puis
 * d'attendre le marqueur suivant. Aucune heuristique, aucune recherche de motif
 * dans les données compressées : on suit la structure telle qu'elle est écrite.
 *
 * Un fichier zstd ordinaire, sans marqueur, traverse le filtre inchangé.
 */
export function stripPzstdMarkers() {
  const SKIPPABLE_MIN = 0x184d2a50
  const SKIPPABLE_MAX = 0x184d2a5f

  let buffer = Buffer.alloc(0)
  /** Octets de frame compressée restant à laisser passer. */
  let remaining = 0
  /** Vrai une fois qu'on a établi que le fichier n'a aucun marqueur. */
  let plain = false

  return new Transform({
    transform(chunk, _encoding, done) {
      if (plain) {
        this.push(chunk)
        done()
        return
      }

      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk])

      for (;;) {
        // On est au milieu d'une frame compressée : on la laisse passer.
        if (remaining > 0) {
          const take = Math.min(remaining, buffer.length)
          if (take > 0) {
            this.push(buffer.subarray(0, take))
            buffer = buffer.subarray(take)
            remaining -= take
          }
          if (remaining > 0) {
            done()
            return
          }
        }

        // Il faut l'en-tête complet pour décider.
        if (buffer.length < 8) {
          done()
          return
        }

        const magic = buffer.readUInt32LE(0)

        if (magic < SKIPPABLE_MIN || magic > SKIPPABLE_MAX) {
          // Pas de marqueur : fichier zstd ordinaire, tout passe désormais.
          plain = true
          this.push(buffer)
          buffer = Buffer.alloc(0)
          done()
          return
        }

        const contentSize = buffer.readUInt32LE(4)
        if (buffer.length < 8 + contentSize) {
          done()
          return
        }

        // Le contenu du marqueur est la taille de la frame qui suit.
        remaining =
          contentSize >= 4 ? buffer.readUInt32LE(8) : 0
        buffer = buffer.subarray(8 + contentSize)

        // Marqueur sans taille exploitable : on ne peut plus segmenter, on
        // laisse le décodeur se débrouiller avec le reste.
        if (remaining === 0) {
          plain = true
          this.push(buffer)
          buffer = Buffer.alloc(0)
          done()
          return
        }
      }
    },
    flush(done) {
      if (buffer.length > 0) this.push(buffer)
      done()
    },
  })
}
