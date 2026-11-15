// Progression du joueur : grilles terminées, étoiles, déblocage des niveaux.
// Fonctions pures, sans affichage ni stockage.

export interface Resultat {
  etoiles: number;
  indices: number;
  secondes?: number; // meilleur temps, s'il a été mesuré
}

export interface Progression {
  terminees: Record<string, Resultat>;
}

export const progressionVide = (): Progression => ({ terminees: {} });

/** 3 étoiles sans indice, 2 étoiles avec 1 ou 2 indices, 1 étoile au-delà. */
export const etoilesPour = (indices: number): number => (indices <= 0 ? 3 : indices <= 2 ? 2 : 1);

/** Enregistre une grille terminée ; on garde toujours le meilleur résultat. */
export function enregistrerResultat(p: Progression, id: string, indices: number, secondes?: number): Progression {
  const ancien = p.terminees[id];
  const nouveau: Resultat = { etoiles: etoilesPour(indices), indices };
  const meilleur: Resultat = ancien && ancien.etoiles >= nouveau.etoiles ? { etoiles: ancien.etoiles, indices: ancien.indices } : nouveau;
  const temps = [ancien?.secondes, secondes].filter((t): t is number => typeof t === 'number');
  if (temps.length > 0) meilleur.secondes = Math.min(...temps);
  return { terminees: { ...p.terminees, [id]: meilleur } };
}

/** La première grille est ouverte ; chaque suivante s'ouvre quand la précédente est terminée. */
export function estDebloquee(ids: string[], p: Progression, id: string): boolean {
  const i = ids.indexOf(id);
  if (i < 0) return false;
  return i === 0 || !!p.terminees[ids[i - 1]];
}

export function grilleSuivante(ids: string[], id: string): string | null {
  const i = ids.indexOf(id);
  return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
}

/** La grille à proposer en premier : la première non terminée, sinon la dernière. */
export function grilleAJouer(ids: string[], p: Progression): string {
  return ids.find((id) => !p.terminees[id]) ?? ids[ids.length - 1];
}

export const totalEtoiles = (p: Progression): number => Object.values(p.terminees).reduce((s, r) => s + r.etoiles, 0);
export const nombreTerminees = (ids: string[], p: Progression): number => ids.filter((id) => p.terminees[id]).length;
