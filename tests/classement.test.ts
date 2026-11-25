import { describe, expect, it } from 'vitest';
import { resultatsAEnvoyer } from '../src/en-ligne/classement';
import type { Progression } from '../src/progression/progression';

const prog = (t: Progression['terminees']): Progression => ({ terminees: t });

describe('classement en ligne', () => {
  it('envoie les grilles dans l’ordre et s’arrête au premier trou de chaque série', () => {
    const p = prog({
      '001': { etoiles: 3, indices: 0, secondes: 120 },
      '002': { etoiles: 2, indices: 1, secondes: 300 },
      '004': { etoiles: 3, indices: 0, secondes: 90 }, // 003 manque : 004 attend
      B01: { etoiles: 1, indices: 4 },
    });
    expect(resultatsAEnvoyer(p, {}).map((r) => r.grille)).toEqual(['001', '002', 'B01']);
  });

  it('n’envoie que ce qui est meilleur que le dernier envoi', () => {
    const p = prog({
      '001': { etoiles: 3, indices: 0, secondes: 120 },
      '002': { etoiles: 2, indices: 1, secondes: 250 },
      '003': { etoiles: 2, indices: 1, secondes: 400 },
    });
    const envoyes = { '001': [3, 120] as [number, number], '002': [2, 300] as [number, number], '003': [3, 100] as [number, number] };
    expect(resultatsAEnvoyer(p, envoyes).map((r) => r.grille)).toEqual(['002']);
  });

  it('écarte un temps invraisemblable (le serveur le refuserait)', () => {
    const p = prog({ '001': { etoiles: 3, indices: 0, secondes: 5 } });
    expect(resultatsAEnvoyer(p, {})).toEqual([{ grille: '001', etoiles: 3, secondes: null }]);
  });
});
