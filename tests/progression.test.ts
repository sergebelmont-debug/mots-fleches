import { describe, expect, it } from 'vitest';
import donnees from '../grilles/001.json';
import { construireGrille, type DonneesGrille } from '../src/engine/grille';
import { creerPartie, motsJustes, partieCompatible, saisirLettre, selectionnerMot } from '../src/engine/partie';
import {
  enregistrerResultat,
  estDebloquee,
  etoilesPour,
  grilleAJouer,
  grilleSuivante,
  nombreTerminees,
  progressionVide,
  totalEtoiles,
} from '../src/progression/progression';
import { charger, CLE, enregistrer, sauvegardeVide, type Stockage } from '../src/storage/sauvegarde';

const ids = ['001', '002', '003'];
const { grille: g } = construireGrille(donnees as DonneesGrille);

function faux(): Stockage & { donnees: Map<string, string> } {
  const d = new Map<string, string>();
  return { donnees: d, getItem: (c) => d.get(c) ?? null, setItem: (c, v) => void d.set(c, v) };
}

describe('progression', () => {
  it('attribue les étoiles selon les indices utilisés', () => {
    expect([0, 1, 2, 3, 10].map(etoilesPour)).toEqual([3, 2, 2, 1, 1]);
  });

  it('seule la première grille est ouverte au départ', () => {
    const p = progressionVide();
    expect(ids.map((id) => estDebloquee(ids, p, id))).toEqual([true, false, false]);
  });

  it('terminer une grille ouvre la suivante, pas les autres', () => {
    const p = enregistrerResultat(progressionVide(), '001', 0);
    expect(ids.map((id) => estDebloquee(ids, p, id))).toEqual([true, true, false]);
    expect(estDebloquee(ids, p, 'inconnue')).toBe(false);
  });

  it('garde le meilleur résultat quand on rejoue', () => {
    let p = enregistrerResultat(progressionVide(), '001', 5);
    expect(p.terminees['001'].etoiles).toBe(1);
    p = enregistrerResultat(p, '001', 0);
    expect(p.terminees['001'].etoiles).toBe(3);
    p = enregistrerResultat(p, '001', 4);
    expect(p.terminees['001'].etoiles).toBe(3);
  });

  it('compte les étoiles et les grilles terminées', () => {
    let p = enregistrerResultat(progressionVide(), '001', 0);
    p = enregistrerResultat(p, '002', 1);
    expect(totalEtoiles(p)).toBe(5);
    expect(nombreTerminees(ids, p)).toBe(2);
  });

  it('propose la première grille non terminée', () => {
    let p = progressionVide();
    expect(grilleAJouer(ids, p)).toBe('001');
    p = enregistrerResultat(p, '001', 0);
    expect(grilleAJouer(ids, p)).toBe('002');
    for (const id of ids) p = enregistrerResultat(p, id, 0);
    expect(grilleAJouer(ids, p)).toBe('003');
  });

  it('donne la grille suivante, ou rien après la dernière', () => {
    expect(grilleSuivante(ids, '001')).toBe('002');
    expect(grilleSuivante(ids, '003')).toBeNull();
  });
});

describe('sauvegarde', () => {
  it('relit exactement ce qui a été enregistré', () => {
    const st = faux();
    const s = sauvegardeVide();
    s.progression = enregistrerResultat(s.progression, '001', 1);
    s.enCours['002'] = saisirLettre(g, selectionnerMot(g, creerPartie(g), 1), 'S');
    s.reglages.musique = false;
    s.reglages.volume = 0.35;
    expect(enregistrer(st, s)).toBe(true);
    expect(charger(st)).toEqual(s);
  });

  it('donne une sauvegarde vide quand il n’y a rien', () => {
    expect(charger(faux())).toEqual(sauvegardeVide());
    expect(charger(null)).toEqual(sauvegardeVide());
  });

  it('résiste à une sauvegarde abîmée', () => {
    for (const contenu of ['pas du json', '[]', '{"version":99}', '{"version":1,"progression":7,"enCours":"x"}', 'null']) {
      const st = faux();
      st.donnees.set(CLE, contenu);
      expect(charger(st)).toEqual(sauvegardeVide());
    }
  });

  it('ignore un résultat mal formé mais garde les autres', () => {
    const st = faux();
    st.donnees.set(CLE, JSON.stringify({ version: 1, progression: { terminees: { '001': { etoiles: 3, indices: 0 }, '002': 'x' } } }));
    expect(charger(st).progression.terminees).toEqual({ '001': { etoiles: 3, indices: 0 } });
  });

  it('ne plante pas si le navigateur refuse d’écrire', () => {
    const st: Stockage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('plein');
      },
    };
    expect(enregistrer(st, sauvegardeVide())).toBe(false);
    expect(enregistrer(null, sauvegardeVide())).toBe(false);
  });
});

describe('reprise d’une partie', () => {
  it('une partie sauvegardée de la bonne grille est acceptée', () => {
    const p = saisirLettre(g, creerPartie(g), 'N');
    expect(partieCompatible(g, JSON.parse(JSON.stringify(p)))).toBe(true);
  });

  it('une partie d’une autre taille ou abîmée est refusée', () => {
    const p = creerPartie(g);
    expect(partieCompatible(g, { ...p, saisie: p.saisie.slice(1) })).toBe(false);
    expect(partieCompatible(g, { ...p, motActif: 99 })).toBe(false);
    expect(partieCompatible(g, { ...p, caseActive: 0 })).toBe(false);
    expect(partieCompatible(g, null)).toBe(false);
    expect(partieCompatible(g, 'x')).toBe(false);
  });

  it('repère les mots entièrement justes', () => {
    const id = g.mots.findIndex((m) => m.reponse === 'BUT');
    let p = selectionnerMot(g, creerPartie(g), id);
    expect(motsJustes(g, p)).toEqual([]);
    for (const l of 'BUT') p = saisirLettre(g, p, l);
    expect(motsJustes(g, p)).toEqual([id]);
  });
});
