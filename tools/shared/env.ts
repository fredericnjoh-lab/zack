import { join } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Charge le .env à la racine du repo. Sans ça, coller sa clé dans .env ne suffirait pas :
 * Node ne lit pas ce fichier tout seul.
 */
export function loadEnv(): void {
  try {
    process.loadEnvFile(join(here, '..', '..', '.env'))
  } catch {
    // Pas de .env : les variables viennent de l'hébergeur (Render), c'est normal.
  }
}
