import { describe, expect, it } from 'vitest';
import { chargerDictionnaire } from '../outils/dictionnaire.ts';
import { controlerLexique, lireLexique, type Entree } from '../outils/lexique.ts';

const { dictionnaire, nomsPropres } = chargerDictionnaire();
const entree = (affichage: string, definition: string, plus: Partial<Entree> = {}): Entree => ({
  reponse: affichage.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  affichage,
  niveau: 1,
  theme: '',
  definition,
  definitions: [definition],
  propre: false,
  ligne: 1,
  ...plus,
});
const controle = (...e: Entree[]) => controlerLexique(e, dictionnaire, nomsPropres).join(' | ');

describe('lexique du projet', () => {
  const lexique = lireLexique();
  it('contient plusieurs centaines de mots', () => expect(lexique.length).toBeGreaterThan(500));
  it('ne contient aucun problème', () => expect(controlerLexique(lexique, dictionnaire, nomsPropres)).toEqual([]));
});

describe('contrôle du lexique', () => {
  it('accepte une entrée correcte', () => expect(controle(entree('ÎLE', "Entourée d'eau"))).toBe(''));
  it('refuse une faute ou un accent oublié', () => expect(controle(entree('ILE', "Entourée d'eau"))).toContain('dictionnaire'));
  it('refuse une définition trop longue', () =>
    expect(controle(entree('ÎLE', 'Terre entièrement entourée par la mer'))).toContain('trop longue'));
  it('refuse une définition qui contient la réponse', () => expect(controle(entree('LIT', 'Un lit pour dormir'))).toContain('figure dans'));
  it('refuse un mot en double', () => expect(controle(entree('LIT', 'Meuble'), entree('LIT', 'Couche'))).toContain('déjà présent'));
  it('refuse deux mots avec la même définition', () => expect(controle(entree('LIT', 'Meuble'), entree('BANC', 'Meuble'))).toContain('même définition'));
  it('refuse un nom propre non déclaré', () => expect(controle(entree('PÉROU', 'Pays des Incas', { propre: true }))).toContain('nom propre'));
});
