import { describe, expect, it } from 'vitest';
import donnees from '../grilles/001.json';
import { construireGrille, type DonneesGrille } from '../src/engine/grille';
import {
  creerPartie,
  effacer,
  effacerMot,
  estTerminee,
  indice,
  motVoisin,
  nombreFausses,
  saisirLettre,
  selectionnerCase,
  selectionnerMot,
  verifier,
  type Partie,
} from '../src/engine/partie';

const d = donnees as DonneesGrille;
const { grille: g, erreurs } = construireGrille(d);
const idMot = (r: string) => g.mots.findIndex((m) => m.reponse === r);
const taper = (p: Partie, texte: string) => [...texte].reduce((q, l) => saisirLettre(g, q, l), p);
const lire = (p: Partie, r: string) => g.mots[idMot(r)].cases.map((k) => p.saisie[k] || '.').join('');

describe('construction de la grille 001', () => {
  it('ne produit aucune erreur', () => expect(erreurs).toEqual([]));

  it('donne à chaque mot autant de cases que de lettres', () => {
    for (const m of g.mots) expect(m.cases.length).toBe(m.reponse.length);
  });

  it('dessine exactement la grille attendue', () => {
    const lignes = Array.from({ length: g.hauteur }, (_, l) =>
      Array.from({ length: g.largeur }, (_, c) => {
        const ca = g.cases[l * g.largeur + c];
        return ca.type === 'lettre' ? ca.lettre : ca.type === 'definition' ? '#' : ' ';
      }).join(''),
    );
    expect(lignes).toEqual(['#N#I#', 'SALLE', '#TIEN', 'BUT#T', '#R#AI', 'RENNE', '#LIER']);
  });

  it('partage les cases de croisement entre deux mots', () => {
    const k = g.mots[idMot('SALLE')].cases[1]; // le A de SALLE
    expect(g.mots[idMot('NATUREL')].cases[1]).toBe(k);
    const ca = g.cases[k];
    expect(ca.type === 'lettre' && ca.mots.length).toBe(2);
  });

  it('oriente les mots selon leur flèche', () => {
    expect(g.mots[idMot('NATUREL')].sens).toBe('V');
    expect(g.mots[idMot('SALLE')].sens).toBe('H');
  });
});

describe('détection des grilles fausses', () => {
  const avec = (r: string, modif: object): DonneesGrille => ({
    ...d,
    mots: d.mots.map((m) => (m.reponse === r ? { ...m, ...modif } : m)),
  });

  it('signale un conflit de lettres au croisement', () => {
    const { erreurs } = construireGrille(avec('SALLE', { reponse: 'SOLLE' }));
    expect(erreurs.some((e) => e.includes('conflit de lettres'))).toBe(true);
  });

  it('signale un mot qui sort de la grille', () => {
    const { erreurs } = construireGrille(avec('LIER', { reponse: 'LIERRE' }));
    expect(erreurs.some((e) => e.includes('sort de la grille'))).toBe(true);
  });

  it('signale un mot qui traverse une case de définition', () => {
    const { erreurs } = construireGrille(avec('BUT', { reponse: 'BUTS' }));
    expect(erreurs.some((e) => e.includes('case de définition'))).toBe(true);
  });
});

describe('sélection', () => {
  it('sélectionner un mot place le curseur sur sa première case', () => {
    const p = selectionnerMot(g, creerPartie(g), idMot('RENNE'));
    expect(p.caseActive).toBe(g.mots[idMot('RENNE')].cases[0]);
  });

  it('retoucher une case de croisement change de sens', () => {
    const k = g.mots[idMot('SALLE')].cases[1];
    const p1 = selectionnerCase(g, creerPartie(g), k);
    const p2 = selectionnerCase(g, p1, k);
    expect(p1.motActif).not.toBe(p2.motActif);
    expect([p1.motActif, p2.motActif].sort()).toEqual([idMot('NATUREL'), idMot('SALLE')].sort());
  });

  it('le mot suivant boucle en fin de liste', () => {
    const p = selectionnerMot(g, creerPartie(g), g.mots.length - 1);
    expect(motVoisin(g, p, 1).motActif).toBe(0);
  });
});

describe('saisie', () => {
  it('écrit les lettres dans le sens du mot', () => {
    const p = taper(selectionnerMot(g, creerPartie(g), idMot('SALLE')), 'salle');
    expect(lire(p, 'SALLE')).toBe('SALLE');
  });

  it('une lettre de croisement apparaît dans les deux mots', () => {
    const p = taper(selectionnerMot(g, creerPartie(g), idMot('SALLE')), 'SALLE');
    expect(lire(p, 'NATUREL')).toBe('.A.....');
  });

  it('passe au mot incomplet suivant quand le mot est rempli', () => {
    const p = taper(selectionnerMot(g, creerPartie(g), idMot('SALLE')), 'SALLE');
    expect(p.motActif).not.toBe(idMot('SALLE'));
  });

  it('ignore ce qui n’est pas une lettre', () => {
    const p0 = creerPartie(g);
    expect(saisirLettre(g, p0, '3')).toBe(p0);
    expect(saisirLettre(g, p0, 'é')).toBe(p0);
  });

  it('effacer retire la dernière lettre tapée', () => {
    let p = taper(selectionnerMot(g, creerPartie(g), idMot('RENNE')), 'RE');
    p = effacer(g, p);
    expect(lire(p, 'RENNE')).toBe('R....');
  });

  it('effacer le mot vide toutes ses cases', () => {
    let p = taper(selectionnerMot(g, creerPartie(g), idMot('RENNE')), 'REN');
    p = effacerMot(g, p);
    expect(lire(p, 'RENNE')).toBe('.....');
  });
});

describe('vérification, indices, fin de grille', () => {
  it('marque uniquement les lettres fausses', () => {
    let p = taper(selectionnerMot(g, creerPartie(g), idMot('LIER')), 'LIEZ');
    p = verifier(g, p);
    expect(nombreFausses(p)).toBe(1);
    expect(p.fausses[g.mots[idMot('LIER')].cases[3]]).toBe(true);
  });

  it('corriger une lettre fausse retire la marque', () => {
    let p = taper(selectionnerMot(g, creerPartie(g), idMot('LIER')), 'LIEZ');
    p = verifier(g, p);
    p = selectionnerCase(g, p, g.mots[idMot('LIER')].cases[3]);
    p = saisirLettre(g, p, 'R');
    expect(nombreFausses(p)).toBe(0);
  });

  it('un indice révèle la bonne lettre et la verrouille', () => {
    const k = g.mots[idMot('BUT')].cases[0];
    let p = indice(g, selectionnerMot(g, creerPartie(g), idMot('BUT')));
    expect(p.saisie[k]).toBe('B');
    expect(p.indices).toBe(1);
    p = saisirLettre(g, selectionnerCase(g, p, k), 'X');
    expect(p.saisie[k]).toBe('B');
    p = effacerMot(g, selectionnerMot(g, p, idMot('BUT')));
    expect(p.saisie[k]).toBe('B');
  });

  it('la grille est terminée quand tous les mots sont justes, pas avant', () => {
    let p = creerPartie(g);
    const debut = (q: Partie, id: number): Partie => ({ ...q, motActif: id, caseActive: g.mots[id].cases[0] });
    for (const m of g.mots.slice(0, -1)) p = taper(debut(p, m.id), m.reponse);
    const dernier = g.mots[g.mots.length - 1];
    p = debut(p, dernier.id);
    const faux = taper(p, 'LIEZ');
    expect(estTerminee(g, faux)).toBe(false);
    expect(estTerminee(g, taper(p, dernier.reponse))).toBe(true);
  });
});
