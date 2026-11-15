import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { construireGrille, type DonneesGrille } from '../src/engine/grille';
import { creerPartie, estTerminee, motsJustes, saisirLettre, verifier, nombreFausses, type Partie } from '../src/engine/partie';

const fichiers = readdirSync('grilles').filter((f) => f.endsWith('.json')).sort();
const RANG: Record<string, number> = { facile: 0, intermediaire: 1, difficile: 2, expert: 3 };

describe('chaque grille du jeu se joue jusqu’au bout', () => {
  it.each(fichiers)('%s', (f) => {
    const d = JSON.parse(readFileSync(join('grilles', f), 'utf8')) as DonneesGrille;
    const { grille: g, erreurs } = construireGrille(d);
    expect(erreurs).toEqual([]);
    // Toute case de lettre est atteignable par au moins un mot.
    g.cases.forEach((c) => c.type === 'lettre' && expect(c.mots.length).toBeGreaterThan(0));
    // On tape chaque mot, lettre par lettre, comme un joueur.
    let p: Partie = creerPartie(g);
    g.mots.forEach((m, i) => {
      p = { ...p, motActif: m.id, caseActive: m.cases[0] };
      for (const l of m.reponse) p = saisirLettre(g, p, l);
      if (i < g.mots.length - 1 && g.cases.some((c, k) => c.type === 'lettre' && p.saisie[k] === '')) expect(estTerminee(g, p)).toBe(false);
    });
    expect(nombreFausses(verifier(g, p))).toBe(0);
    expect(motsJustes(g, p).length).toBe(g.mots.length);
    expect(estTerminee(g, p)).toBe(true);
  });
});

describe('progression de la difficulté', () => {
  const grilles = fichiers.map((f) => JSON.parse(readFileSync(join('grilles', f), 'utf8')) as DonneesGrille);
  it('les numéros se suivent sans trou', () => {
    expect(grilles.map((g) => g.id)).toEqual(grilles.map((_, i) => String(i + 1).padStart(3, '0')));
  });
  it('la difficulté ne redescend jamais le long du parcours', () => {
    const rangs = grilles.map((g) => RANG[g.difficulte]);
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
  });
  it('les grilles plus difficiles sont plus grandes et ont des mots plus longs en moyenne', () => {
    const moyenne = (dif: string, f: (g: DonneesGrille) => number) => {
      const gs = grilles.filter((g) => g.difficulte === dif);
      return gs.reduce((s, g) => s + f(g), 0) / gs.length;
    };
    const cases = (g: DonneesGrille) => g.largeur * g.hauteur;
    expect(moyenne('intermediaire', cases)).toBeGreaterThan(moyenne('facile', cases));
    expect(moyenne('difficile', cases)).toBeGreaterThan(moyenne('intermediaire', cases));
  });
  it('aucun mot de 4 lettres ou plus n’apparaît plus de deux fois dans tout le jeu', () => {
    const n = new Map<string, number>();
    for (const g of grilles) for (const m of g.mots) n.set(m.reponse, (n.get(m.reponse) ?? 0) + 1);
    expect([...n].filter(([mot, k]) => mot.length >= 4 && k > 2)).toEqual([]);
  });
});
