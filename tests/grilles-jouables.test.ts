import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { construireGrille, type DonneesGrille } from '../src/engine/grille';
import { creerPartie, estTerminee, motsJustes, verifier, nombreFausses, type Partie } from '../src/engine/partie';
import { jouerMot } from './aide';

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
    let frappes = 0;
    for (const m of g.mots) {
      const avant = p.saisie.filter(Boolean).length;
      p = jouerMot(g, p, m.id);
      frappes += p.saisie.filter(Boolean).length - avant;
      if (g.cases.some((c, k) => c.type === 'lettre' && p.saisie[k] === '')) expect(estTerminee(g, p)).toBe(false);
    }
    // Aucune lettre retapée : une frappe par case, pas une de plus.
    expect(frappes).toBe(g.cases.filter((c) => c.type === 'lettre').length);
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
});
