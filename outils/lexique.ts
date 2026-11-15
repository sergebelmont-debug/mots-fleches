// Lecture et contrôle du lexique (donnees/lexique.txt).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normaliser } from '../src/validation/valider.ts';

export interface Entree {
  reponse: string; // forme écrite dans les cases (ILE)
  affichage: string; // forme correcte (ÎLE)
  niveau: number; // 1 courant, 2 moyen, 3 rare
  theme: string; // '' si aucun
  definition: string;
  propre: boolean;
  ligne: number;
}

export const LONGUEUR_MAX_DEFINITION = 24;
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

export function lireLexique(chemin = join(racine, 'donnees', 'lexique.txt')): Entree[] {
  const entrees: Entree[] = [];
  readFileSync(chemin, 'utf8')
    .split(/\r?\n/)
    .forEach((brut, i) => {
      const l = brut.trim();
      if (!l || l.startsWith('#')) return;
      const [affichage = '', niveau = '', theme = '', definition = '', propre = ''] = l.split('|').map((x) => x.trim());
      entrees.push({ reponse: normaliser(affichage), affichage, niveau: Number(niveau), theme, definition, propre: propre === 'propre', ligne: i + 1 });
    });
  return entrees;
}

/** Contrôle le lexique. Renvoie la liste des problèmes (vide si tout va bien). */
export function controlerLexique(entrees: Entree[], dictionnaire: ReadonlySet<string>, nomsPropres: ReadonlySet<string>): string[] {
  const pb: string[] = [];
  const vus = new Map<string, number>();
  const defs = new Map<string, string>();
  for (const e of entrees) {
    const ou = `ligne ${e.ligne} (${e.affichage})`;
    if (!/^[A-Z]{2,}$/.test(e.reponse)) pb.push(`${ou} : mot invalide`);
    if (![1, 2, 3].includes(e.niveau)) pb.push(`${ou} : niveau invalide`);
    if (!e.definition) pb.push(`${ou} : définition vide`);
    if (e.definition.length > LONGUEUR_MAX_DEFINITION) pb.push(`${ou} : définition trop longue (${e.definition.length} caractères)`);
    if (e.reponse.length >= 3 && normaliser(e.definition).includes(e.reponse)) pb.push(`${ou} : la réponse figure dans la définition`);
    if (vus.has(e.reponse)) pb.push(`${ou} : mot déjà présent ligne ${vus.get(e.reponse)}`);
    vus.set(e.reponse, e.ligne);
    const cle = normaliser(e.definition);
    if (defs.has(cle)) pb.push(`${ou} : même définition que ${defs.get(cle)}`);
    defs.set(cle, e.affichage);
    if (e.propre) {
      if (!nomsPropres.has(e.affichage)) pb.push(`${ou} : nom propre absent de donnees/noms-propres.json`);
    } else if (!dictionnaire.has(e.affichage.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae'))) {
      pb.push(`${ou} : absent du dictionnaire (orthographe ou accents)`);
    }
  }
  return pb;
}
