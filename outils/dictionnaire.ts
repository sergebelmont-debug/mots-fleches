// Charge le dictionnaire de référence (336 000 formes françaises, avec accents)
// et la liste des noms propres autorisés du projet.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

export function chargerDictionnaire(): { dictionnaire: Set<string>; nomsPropres: Set<string> } {
  const require = createRequire(import.meta.url);
  const mots = require('an-array-of-french-words') as string[];
  const noms = JSON.parse(readFileSync(join(racine, 'donnees', 'noms-propres.json'), 'utf8')) as string[];
  return { dictionnaire: new Set(mots), nomsPropres: new Set(noms) };
}
