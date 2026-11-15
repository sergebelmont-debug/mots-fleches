import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import base from '../grilles/001.json';
import { chargerDictionnaire } from '../outils/dictionnaire.ts';
import { normaliser, validerGrille } from '../src/validation/valider.ts';

const options = chargerDictionnaire();
type Mot = (typeof base.mots)[number];
type Donnees = Omit<typeof base, 'mots'> & { mots: Record<string, unknown>[] };

/** Copie de la grille 001 où le mot « r » est modifié. */
const avec = (r: string, modif: Partial<Record<keyof Mot, unknown>>): Donnees => ({
  ...base,
  mots: base.mots.map((m) => (m.reponse === r ? { ...m, ...modif } : m)),
});
const codes = (g: unknown, o = options) => validerGrille(g, o).erreurs.map((e) => e.code);
const alertes = (g: unknown) => validerGrille(g, options).avertissements.map((a) => a.code);

/** Petite grille 3 × 3 valide : deux mots horizontaux séparés par une ligne vide. */
const mini = (r1: string, r2: string, d1 = 'Premier', d2 = 'Second') => ({
  id: 'mini',
  titre: 'Mini',
  theme: 'test',
  difficulte: 'facile',
  largeur: 3,
  hauteur: 3,
  mots: [
    { caseDefinition: [0, 0], fleche: 'droite', definition: d1, reponse: normaliser(r1), affichage: r1 },
    { caseDefinition: [2, 0], fleche: 'droite', definition: d2, reponse: normaliser(r2), affichage: r2 },
  ],
});

describe('grilles du projet', () => {
  const fichiers = readdirSync('grilles').filter((f) => f.endsWith('.json'));
  it('il y a au moins une grille', () => expect(fichiers.length).toBeGreaterThan(0));
  it.each(fichiers)('%s est valide', (f) => {
    const r = validerGrille(JSON.parse(readFileSync(join('grilles', f), 'utf8')), options);
    expect(r.erreurs).toEqual([]);
    expect(r.valide).toBe(true);
  });
});

describe('grilles volontairement fausses (fichiers)', () => {
  it.each([
    ['901.json', 'E-CROISEMENT'],
    ['902.json', 'E-LONGUEUR'],
    ['903.json', 'E-DICTIONNAIRE'],
    ['904.json', 'E-MOT-SANS-DEFINITION'],
  ])('%s est refusée avec %s', (f, code) => {
    const r = validerGrille(JSON.parse(readFileSync(join('tests/grilles-fausses', f), 'utf8')), options);
    expect(r.valide).toBe(false);
    expect(r.erreurs.map((e) => e.code)).toContain(code);
  });
});

describe('structure', () => {
  it('refuse un fichier qui n’est pas une grille', () => {
    expect(codes(null)).toEqual(['E-FORMAT']);
    expect(codes([])).toEqual(['E-FORMAT']);
    expect(codes({ ...base, mots: [] })).toContain('E-FORMAT');
    expect(codes({ ...base, largeur: 0 })).toContain('E-FORMAT');
    expect(codes({ ...base, difficulte: 'moyen' })).toContain('E-FORMAT');
  });

  it('refuse une case de définition hors de la grille', () => {
    expect(codes(avec('LIER', { caseDefinition: [9, 9] }))).toContain('E-HORS-GRILLE');
  });

  it('refuse une réponse qui sort de la grille', () => {
    expect(codes(avec('LIER', { reponse: 'LIERRE', affichage: 'LIERRE' }))).toContain('E-HORS-GRILLE');
  });

  it('refuse deux lettres contradictoires à un croisement', () => {
    expect(codes(avec('SALLE', { reponse: 'SELLE', affichage: 'SELLE' }))).toEqual(['E-CROISEMENT']);
  });

  it('refuse une réponse trop courte pour son emplacement', () => {
    expect(codes(avec('LIER', { reponse: 'LIE', affichage: 'LIE' }))).toEqual(['E-LONGUEUR']);
  });

  it('refuse une réponse trop longue qui recouvre une case de définition', () => {
    expect(codes(avec('BUT', { reponse: 'BUTS', affichage: 'BUTS' }))).toContain('E-CASE-MIXTE');
  });

  it('refuse une flèche inconnue', () => {
    expect(codes(avec('LIER', { fleche: 'gauche' }))).toContain('E-FLECHE');
  });

  it('refuse une flèche qui pointe dans la mauvaise direction', () => {
    // ENTIER est vertical : avec une flèche « droite », il sort de la grille.
    expect(codes(avec('ENTIER', { fleche: 'droite' })).length).toBeGreaterThan(0);
    // TIEN est horizontal : avec « bas-puis-droite » il tombe sur la ligne de BUT.
    expect(codes(avec('TIEN', { fleche: 'bas-puis-droite' })).length).toBeGreaterThan(0);
  });

  it('refuse plus de deux définitions dans une case', () => {
    const g = { ...base, mots: [...base.mots, { ...base.mots[0], fleche: 'droite', reponse: 'NA', affichage: 'NA' }] };
    expect(codes(g)).toContain('E-DEF-TROP');
  });

  it('refuse un mot formé par les lettres mais sans définition', () => {
    expect(codes({ ...base, mots: base.mots.filter((m) => m.reponse !== 'AI') })).toEqual(['E-MOT-SANS-DEFINITION']);
  });

  it('refuse deux mots au même emplacement', () => {
    const g = mini('ni', 'et');
    g.mots.push({ caseDefinition: [1, 1], fleche: 'bas-puis-droite', definition: 'Autre', reponse: 'ET', affichage: 'et' });
    expect(codes(g)).toContain('E-EMPLACEMENT-DOUBLE');
  });

  it('accepte la petite grille de référence', () => {
    expect(codes(mini('ni', 'et'))).toEqual([]);
  });
});

describe('contenu linguistique', () => {
  it('refuse les accents, minuscules ou espaces dans une réponse', () => {
    expect(codes(avec('ILE', { reponse: 'ÎLE' }))).toContain('E-CARACTERES');
    expect(codes(avec('ILE', { reponse: 'ile' }))).toContain('E-CARACTERES');
    expect(codes(avec('ILE', { reponse: 'I E' }))).toContain('E-CARACTERES');
  });

  it('refuse un « affichage » qui ne correspond pas à la réponse', () => {
    expect(codes(avec('ILE', { affichage: 'ÎLOT' }))).toContain('E-AFFICHAGE');
  });

  it('refuse un accent oublié ou une faute d’orthographe', () => {
    expect(codes(avec('ILE', { affichage: 'ILE' }))).toEqual(['E-DICTIONNAIRE']);
    expect(codes(mini('nj', 'et'))).toEqual(['E-DICTIONNAIRE']);
  });

  it('accepte œ écrit OE dans les cases', () => {
    expect(normaliser('CŒUR')).toBe('COEUR');
    expect(normaliser('Arc-en-ciel')).toBe('ARCENCIEL');
    expect(normaliser('ÉTÉ')).toBe('ETE');
  });

  it('n’accepte un nom propre que s’il est dans la liste autorisée', () => {
    const g = mini('PÉROU', 'et');
    g.largeur = 6;
    expect(codes(g)).toEqual(['E-DICTIONNAIRE']);
    expect(codes(g, { ...options, nomsPropres: new Set(['PÉROU']) })).toEqual([]);
  });

  it('refuse une réponse en double', () => {
    expect(codes(mini('ni', 'ni'))).toEqual(['E-REPONSE-DOUBLE']);
  });

  it('refuse une définition vide', () => {
    expect(codes(avec('LIER', { definition: '  ' }))).toContain('E-DEFINITION');
  });
});

describe('avertissements', () => {
  it('signale deux définitions identiques', () => {
    expect(alertes(mini('ni', 'et', 'Petit mot', 'petit mot'))).toContain('A-DEFINITION-DOUBLE');
  });
  it('signale une réponse présente dans sa définition', () => {
    expect(alertes(avec('LIER', { definition: 'Relier deux choses' }))).toContain('A-REPONSE-DANS-DEFINITION');
  });
  it('signale une définition trop longue', () => {
    expect(alertes(avec('LIER', { definition: 'Attacher solidement avec une corde ou une ficelle' }))).toContain('A-DEFINITION-LONGUE');
  });
  it('un avertissement ne rend pas la grille invalide', () => {
    expect(validerGrille(avec('LIER', { definition: 'Relier deux choses' }), options).valide).toBe(true);
  });
});

describe('reproductibilité', () => {
  it('donne exactement le même rapport à chaque exécution', () => {
    const g = avec('SALLE', { reponse: 'SELLE', affichage: 'SELLE' });
    expect(validerGrille(g, options)).toEqual(validerGrille(g, options));
  });
  it('ne modifie pas les données reçues', () => {
    const copie = JSON.stringify(base);
    validerGrille(base, options);
    expect(JSON.stringify(base)).toBe(copie);
  });
});
