import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lireLexique } from '../outils/lexique.ts';
import { motAutorise, numeroNiveau, problemesRepetition, regle } from '../src/validation/repetitions';

const grille = (id: string, ...mots: string[]) => ({ id, mots: mots.map((reponse) => ({ reponse })) });

describe('règles de répétition', () => {
  it('mots de 4 lettres et plus : une seule fois', () => {
    expect(regle(4)).toEqual({ max: 1, ecart: Infinity });
    expect(motAutorise(6, 20, [])).toBe(true);
    expect(motAutorise(6, 20, [3])).toBe(false);
  });
  it('mots de 3 lettres : deux fois au plus, à 10 niveaux d’écart au moins', () => {
    expect(motAutorise(3, 15, [5])).toBe(true);
    expect(motAutorise(3, 14, [5])).toBe(false);
    expect(motAutorise(3, 30, [5, 18])).toBe(false);
  });
  it('mots de 2 lettres : jamais dans deux niveaux qui se suivent, 5 fois au plus', () => {
    expect(motAutorise(2, 6, [5])).toBe(false);
    expect(motAutorise(2, 7, [5])).toBe(true);
    expect(motAutorise(2, 30, [2, 8, 14, 20, 26])).toBe(false);
  });
  it('reconnaît le numéro de niveau', () => {
    expect(numeroNiveau('007')).toBe(7);
    expect(numeroNiveau('B03')).toBe(3);
  });
  it('signale chaque infraction de façon lisible', () => {
    const pb = problemesRepetition([grille('001', 'SALLE', 'NI', 'ILE'), grille('002', 'SALLE', 'NI'), grille('005', 'ILE')]);
    expect(pb).toEqual([
      'ILE apparaît aux niveaux 1, 5 (au plus 2 fois, à au moins 10 niveaux d’écart)',
      'NI apparaît aux niveaux 1, 2 (au plus 5 fois, à au moins 2 niveaux d’écart)',
      'SALLE apparaît aux niveaux 1, 2 (un mot de 4 lettres ou plus ne doit apparaître qu’une fois)',
    ]);
  });
  it('ne signale rien quand les règles sont respectées', () => {
    expect(problemesRepetition([grille('001', 'SALLE', 'NI', 'ILE'), grille('003', 'RENNE', 'NI'), grille('011', 'ILE')])).toEqual([]);
  });
});

describe('parcours principal', () => {
  const grilles = readdirSync('grilles')
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join('grilles', f), 'utf8')) as { id: string; mots: { reponse: string; definition: string }[] });

  it('respecte les règles de répétition', () => expect(problemesRepetition(grilles)).toEqual([]));

  it('deux niveaux qui se suivent n’ont aucun mot en commun', () => {
    for (let i = 1; i < grilles.length; i++) {
      const avant = new Set(grilles[i - 1].mots.map((m) => m.reponse));
      const communs = grilles[i].mots.map((m) => m.reponse).filter((r) => avant.has(r));
      expect(communs, `niveaux ${i} et ${i + 1}`).toEqual([]);
    }
  });

  it('un petit mot qui revient ne garde jamais la même définition que la fois précédente (s’il en a plusieurs)', () => {
    const plusieurs = new Set(lireLexique().filter((e) => e.definitions.length > 1).map((e) => e.reponse));
    const derniere = new Map<string, string>();
    const memes: string[] = [];
    for (const g of grilles)
      for (const m of g.mots) {
        if (m.reponse.length !== 2 || !plusieurs.has(m.reponse)) continue;
        if (derniere.get(m.reponse) === m.definition) memes.push(`${m.reponse} niveau ${Number(g.id)}`);
        derniere.set(m.reponse, m.definition);
      }
    expect(memes).toEqual([]);
  });

  it('TRI n’est plus défini par « Classement »', () => {
    expect(grilles.flatMap((g) => g.mots).filter((m) => m.definition === 'Classement')).toEqual([]);
  });
});
