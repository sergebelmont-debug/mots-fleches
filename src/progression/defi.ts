// Défi quotidien : une grille par jour, la même pour tous les joueurs.
import { etoilesPour } from './progression';
import { statsVides, type Stats } from './statistiques';
import { enregistrerResultat, type Progression } from './progression';

export interface ResultatDefi {
  etoiles: number;
  indices: number;
  secondes: number;
}

/** Choisit la grille du jour à partir de la date : même date = même grille, partout. */
export function grilleDuDefi(ids: string[], jour: string): string {
  let h = 2166136261;
  for (const c of jour) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ids[(h >>> 0) % ids.length];
}

export const cleDefi = (jour: string) => `defi:${jour}`;

/** Ce qui change quand une grille est terminée. Utilisé par l'interface et testé à part. */
export interface EtatJeu {
  progression: Progression;
  defis: Record<string, ResultatDefi>;
  stats: Stats;
  enCours: Record<string, unknown>;
}

export function terminerGrille<T extends EtatJeu>(
  s: T,
  fin: { cle: string; idGrille: string; defiDuJour: string | null; indices: number; secondes: number },
): T {
  const enCours = { ...s.enCours };
  delete enCours[fin.cle];
  const stats: Stats = {
    ...(s.stats ?? statsVides()),
    partiesTerminees: s.stats.partiesTerminees + 1,
    secondesTotal: s.stats.secondesTotal + fin.secondes,
    indicesTotal: s.stats.indicesTotal + fin.indices,
  };
  if (fin.defiDuJour) {
    const ancien = s.defis[fin.defiDuJour];
    const nouveau = { etoiles: etoilesPour(fin.indices), indices: fin.indices, secondes: fin.secondes };
    const meilleur = !ancien || nouveau.etoiles > ancien.etoiles || (nouveau.etoiles === ancien.etoiles && nouveau.secondes < ancien.secondes);
    return { ...s, enCours, stats, defis: meilleur ? { ...s.defis, [fin.defiDuJour]: nouveau } : s.defis };
  }
  return { ...s, enCours, stats, progression: enregistrerResultat(s.progression, fin.idGrille, fin.indices, fin.secondes) };
}
