// État d'une partie en cours et actions du joueur.
// Fonctions pures : chacune reçoit un état et en renvoie un nouveau.

import type { Grille } from './grille';

export interface Partie {
  saisie: string[]; // lettre tapée par case ('' si vide)
  verrouillees: boolean[]; // cases révélées par un indice
  fausses: boolean[]; // cases marquées fausses à la dernière vérification
  motActif: number;
  caseActive: number;
  indices: number; // nombre d'indices utilisés
}

export function creerPartie(g: Grille): Partie {
  const n = g.cases.length;
  return {
    saisie: Array(n).fill(''),
    verrouillees: Array(n).fill(false),
    fausses: Array(n).fill(false),
    motActif: 0,
    caseActive: g.mots[0].cases[0],
    indices: 0,
  };
}

const motComplet = (g: Grille, p: Partie, id: number) => g.mots[id].cases.every((k) => p.saisie[k] !== '');

/** Sélectionne un mot ; le curseur va sur sa première case vide. */
export function selectionnerMot(g: Grille, p: Partie, id: number): Partie {
  const cases = g.mots[id].cases;
  return { ...p, motActif: id, caseActive: cases.find((k) => p.saisie[k] === '') ?? cases[0] };
}

/** Touche une case de lettre. Retoucher la même case change de sens au croisement. */
export function selectionnerCase(g: Grille, p: Partie, k: number): Partie {
  const c = g.cases[k];
  if (c.type !== 'lettre') return p;
  let mot = c.mots.includes(p.motActif) ? p.motActif : c.mots[0];
  if (k === p.caseActive && c.mots.length > 1) mot = c.mots.find((m) => m !== p.motActif) ?? mot;
  return { ...p, motActif: mot, caseActive: k };
}

/** Passe au mot suivant (ou précédent), en boucle. */
export function motVoisin(g: Grille, p: Partie, pas: 1 | -1): Partie {
  const n = g.mots.length;
  return selectionnerMot(g, p, (p.motActif + pas + n) % n);
}

function avancer(g: Grille, p: Partie): Partie {
  const cases = g.mots[p.motActif].cases;
  const pos = cases.indexOf(p.caseActive);
  if (pos < cases.length - 1) return { ...p, caseActive: cases[pos + 1] };
  if (!motComplet(g, p, p.motActif)) return p;
  // Mot rempli : on saute au prochain mot incomplet, s'il en reste un.
  const n = g.mots.length;
  for (let i = 1; i < n; i++) {
    const id = (p.motActif + i) % n;
    if (!motComplet(g, p, id)) return selectionnerMot(g, p, id);
  }
  return p;
}

export function saisirLettre(g: Grille, p: Partie, lettre: string): Partie {
  const l = lettre.toUpperCase();
  if (!/^[A-Z]$/.test(l)) return p;
  const k = p.caseActive;
  if (p.verrouillees[k]) return avancer(g, p);
  const saisie = [...p.saisie];
  const fausses = [...p.fausses];
  saisie[k] = l;
  fausses[k] = false;
  return avancer(g, { ...p, saisie, fausses });
}

/** Efface la lettre courante ; si la case est déjà vide, recule et efface. */
export function effacer(g: Grille, p: Partie): Partie {
  const cases = g.mots[p.motActif].cases;
  let k = p.caseActive;
  if (p.saisie[k] === '' || p.verrouillees[k]) {
    const pos = cases.indexOf(k);
    if (pos <= 0) return p;
    k = cases[pos - 1];
  }
  if (p.verrouillees[k]) return { ...p, caseActive: k };
  const saisie = [...p.saisie];
  const fausses = [...p.fausses];
  saisie[k] = '';
  fausses[k] = false;
  return { ...p, saisie, fausses, caseActive: k };
}

export function effacerMot(g: Grille, p: Partie): Partie {
  const saisie = [...p.saisie];
  const fausses = [...p.fausses];
  const cases = g.mots[p.motActif].cases;
  for (const k of cases)
    if (!p.verrouillees[k]) {
      saisie[k] = '';
      fausses[k] = false;
    }
  return { ...p, saisie, fausses, caseActive: cases.find((k) => saisie[k] === '') ?? cases[0] };
}

/** Marque en « fausses » les lettres tapées qui ne sont pas les bonnes. */
export function verifier(g: Grille, p: Partie): Partie {
  const fausses = g.cases.map((c, k) => c.type === 'lettre' && p.saisie[k] !== '' && p.saisie[k] !== c.lettre);
  return { ...p, fausses };
}

export const nombreFausses = (p: Partie) => p.fausses.filter(Boolean).length;

/** Indice : révèle la lettre de la case active et la verrouille. */
export function indice(g: Grille, p: Partie): Partie {
  const k = p.caseActive;
  const c = g.cases[k];
  if (c.type !== 'lettre' || p.verrouillees[k]) return p;
  const saisie = [...p.saisie];
  const verrouillees = [...p.verrouillees];
  const fausses = [...p.fausses];
  saisie[k] = c.lettre;
  verrouillees[k] = true;
  fausses[k] = false;
  return avancer(g, { ...p, saisie, verrouillees, fausses, indices: p.indices + 1 });
}

export function estTerminee(g: Grille, p: Partie): boolean {
  return g.cases.every((c, k) => c.type !== 'lettre' || p.saisie[k] === c.lettre);
}

/** Vrai si toutes les cases du mot contiennent la bonne lettre. */
export function motJuste(g: Grille, p: Partie, id: number): boolean {
  return g.mots[id].cases.every((k) => {
    const c = g.cases[k];
    return c.type === 'lettre' && p.saisie[k] === c.lettre;
  });
}

export const motsJustes = (g: Grille, p: Partie): number[] => g.mots.filter((m) => motJuste(g, p, m.id)).map((m) => m.id);

/** Vrai si une partie sauvegardée correspond bien à cette grille (même taille, curseur valide). */
export function partieCompatible(g: Grille, p: unknown): p is Partie {
  const q = p as Partie | null;
  const n = g.cases.length;
  return (
    typeof q === 'object' &&
    q !== null &&
    [q.saisie, q.verrouillees, q.fausses].every((t) => Array.isArray(t) && t.length === n) &&
    Number.isInteger(q.motActif) &&
    q.motActif >= 0 &&
    q.motActif < g.mots.length &&
    g.mots[q.motActif].cases.includes(q.caseActive) &&
    Number.isInteger(q.indices)
  );
}
