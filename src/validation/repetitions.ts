// Règles contre les répétitions de mots d'une grille à l'autre, dans un même parcours.
// Utilisées par l'outil de génération (pour choisir les mots), par la commande de
// vérification (pour refuser un parcours qui ne les respecte pas) et par les tests.

export interface Regle {
  /** Nombre maximal d'apparitions dans tout le parcours. */
  max: number;
  /** Écart minimal entre deux niveaux qui utilisent le même mot (5 et 8 : écart de 3). */
  ecart: number;
}

/**
 * - 4 lettres et plus : une seule fois dans tout le parcours.
 * - 3 lettres : au plus 2 fois, à au moins 10 niveaux d'écart.
 * - 2 lettres (inévitables dans les mots fléchés) : au plus 5 fois, jamais dans deux niveaux qui se suivent.
 */
export function regle(longueur: number): Regle {
  if (longueur >= 4) return { max: 1, ecart: Infinity };
  if (longueur === 3) return { max: 2, ecart: 10 };
  return { max: 5, ecart: 2 };
}

/** Numéro de niveau tiré de l'identifiant : « 007 » → 7, « B03 » → 3. */
export const numeroNiveau = (id: string): number => Number(id.replace(/\D/g, '')) || 0;

/** Un mot peut-il être placé au niveau `niveau`, sachant les niveaux où il apparaît déjà ? */
export function motAutorise(longueur: number, niveau: number, niveauxDeja: number[]): boolean {
  const r = regle(longueur);
  const autres = niveauxDeja.filter((n) => n !== niveau);
  return autres.length < r.max && autres.every((n) => Math.abs(n - niveau) >= r.ecart);
}

/** Liste lisible des infractions aux règles dans un ensemble de grilles. */
export function problemesRepetition(grilles: { id: string; mots: { reponse: string }[] }[]): string[] {
  const niveaux = new Map<string, number[]>();
  for (const g of grilles) for (const m of g.mots) niveaux.set(m.reponse, [...(niveaux.get(m.reponse) ?? []), numeroNiveau(g.id)]);
  const pb: string[] = [];
  for (const [mot, liste] of niveaux) {
    if (liste.length < 2) continue;
    const r = regle(mot.length);
    const tries = [...liste].sort((a, b) => a - b);
    const tropProches = tries.slice(1).some((n, i) => n - tries[i] < r.ecart);
    if (liste.length > r.max || tropProches) {
      const pourquoi = mot.length >= 4 ? 'un mot de 4 lettres ou plus ne doit apparaître qu’une fois' : `au plus ${r.max} fois, à au moins ${r.ecart} niveaux d’écart`;
      pb.push(`${mot} apparaît aux niveaux ${tries.join(', ')} (${pourquoi})`);
    }
  }
  return pb.sort();
}
