// Moteur de grille : transforme les données d'une grille (liste de mots)
// en une grille de cases. Aucun affichage ici.

export type Fleche = 'droite' | 'bas' | 'droite-puis-bas' | 'bas-puis-droite';

/** Données brutes, telles qu'écrites dans un fichier de grilles/. */
export interface DonneesMot {
  caseDefinition: [number, number]; // [ligne, colonne]
  fleche: Fleche;
  definition: string;
  reponse: string; // majuscules sans accents
  affichage: string; // forme correcte avec accents
}

export interface DonneesGrille {
  id: string;
  titre: string;
  theme: string;
  difficulte: string;
  largeur: number;
  hauteur: number;
  mots: DonneesMot[];
}

export interface Mot extends DonneesMot {
  id: number;
  sens: 'H' | 'V';
  caseDef: number; // index de la case de définition
  cases: number[]; // index des cases de lettres, dans l'ordre
}

export type Case =
  | { type: 'vide' }
  | { type: 'definition'; mots: number[] }
  | { type: 'lettre'; lettre: string; mots: number[] };

export interface Grille {
  id: string;
  titre: string;
  largeur: number;
  hauteur: number;
  cases: Case[];
  mots: Mot[];
}

/** Où commence le mot et dans quel sens il s'écrit, selon la flèche. */
const DEPARTS: Record<Fleche, { dl: number; dc: number; sens: 'H' | 'V' }> = {
  droite: { dl: 0, dc: 1, sens: 'H' },
  bas: { dl: 1, dc: 0, sens: 'V' },
  'droite-puis-bas': { dl: 0, dc: 1, sens: 'V' },
  'bas-puis-droite': { dl: 1, dc: 0, sens: 'H' },
};

/**
 * Construit la grille à partir des mots. Les lettres ne sont écrites qu'une
 * fois (dans les réponses) : un croisement contradictoire est donc détecté ici.
 */
export function construireGrille(d: DonneesGrille): { grille: Grille; erreurs: string[] } {
  const erreurs: string[] = [];
  const { largeur: L, hauteur: H } = d;
  const cases: Case[] = Array.from({ length: L * H }, () => ({ type: 'vide' }) as Case);
  const dedans = (l: number, c: number) => l >= 0 && c >= 0 && l < H && c < L;
  const mots: Mot[] = [];

  d.mots.forEach((m, id) => {
    const nom = `mot ${id + 1} « ${m.reponse} »`;
    const [l0, c0] = m.caseDefinition;
    const dep = DEPARTS[m.fleche];
    if (!dep) return void erreurs.push(`${nom} : flèche inconnue « ${m.fleche} »`);
    if (!dedans(l0, c0)) return void erreurs.push(`${nom} : case de définition hors de la grille`);

    const caseDef = l0 * L + c0;
    const cd = cases[caseDef];
    if (cd.type === 'lettre') erreurs.push(`${nom} : sa case de définition est aussi une case de lettre`);
    else if (cd.type === 'definition') cd.mots.push(id);
    else cases[caseDef] = { type: 'definition', mots: [id] };

    const idx: number[] = [];
    for (let i = 0; i < m.reponse.length; i++) {
      const l = l0 + dep.dl + (dep.sens === 'V' ? i : 0);
      const c = c0 + dep.dc + (dep.sens === 'H' ? i : 0);
      if (!dedans(l, c)) {
        erreurs.push(`${nom} : sort de la grille`);
        break;
      }
      const k = l * L + c;
      const lettre = m.reponse[i];
      const ca = cases[k];
      if (ca.type === 'definition') {
        erreurs.push(`${nom} : passe sur une case de définition (ligne ${l + 1}, colonne ${c + 1})`);
      } else if (ca.type === 'lettre') {
        if (ca.lettre !== lettre)
          erreurs.push(`${nom} : conflit de lettres au croisement (ligne ${l + 1}, colonne ${c + 1}) : ${ca.lettre} ≠ ${lettre}`);
        ca.mots.push(id);
      } else {
        cases[k] = { type: 'lettre', lettre, mots: [id] };
      }
      idx.push(k);
    }
    mots.push({ ...m, id, sens: dep.sens, caseDef, cases: idx });
  });

  return { grille: { id: d.id, titre: d.titre, largeur: L, hauteur: H, cases, mots }, erreurs };
}
