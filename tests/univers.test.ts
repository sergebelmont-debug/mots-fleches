import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import base from '../grilles/001.json';
import { chargerDictionnaire } from '../outils/dictionnaire.ts';
import { controlerLexique, lireLexique } from '../outils/lexique.ts';
import { construireGrille, type DonneesGrille } from '../src/engine/grille';
import { creerPartie, estTerminee, type Partie } from '../src/engine/partie';
import { jouerMot } from './aide';
import { terminerGrille } from '../src/progression/defi';
import { recompenses } from '../src/progression/recompenses';
import { sauvegardeVide } from '../src/storage/sauvegarde';
import { validerGrille } from '../src/validation/valider.ts';

const options = chargerDictionnaire();
const DOSSIER = 'grilles/serge-belmont';
const fichiers = readdirSync(DOSSIER).filter((f) => f.endsWith('.json')).sort();
const lire = (f: string) => JSON.parse(readFileSync(join(DOSSIER, f), 'utf8')) as DonneesGrille;

// Lexique de l'univers ; une définition vide reprend celle du lexique général.
const general = new Map(lireLexique().map((e) => [e.reponse, e]));
const univers = lireLexique('donnees/univers/serge-belmont.txt').map((e) => ({
  ...e,
  definition: e.definition || general.get(e.reponse)?.definition || '',
  definitions: e.definitions.length ? e.definitions : (general.get(e.reponse)?.definitions ?? []),
}));
const motsUnivers = new Set(univers.map((e) => e.reponse));

// Titres autorisés par la fiche de l'auteur : aucun autre ne doit apparaître entre guillemets.
const TITRES = [
  'Garde une place pour moi', 'Le Village', 'La Vieille Photographie', 'Sous les lampadaires', 'Ne grandis pas trop vite',
  'Porquerolles', 'Les Mains de ma mère', 'Le Bal', 'La Lettre', 'Le Marionnettiste', 'Je t’aime', 'L’Odeur des orangers',
  'Écoute ma prière', 'L’Amour n’a pas d’âge', 'Pardonne-moi', 'Il est encore temps',
];
const CITATIONS = ['Porquerolles, mon île aux mille étés', 'Il a suffi d’un regard', 'Suis-je vraiment en vie ?'];
const simple = (s: string) => s.toLowerCase().replace(/[’']/g, '’').replace(/\s+/g, ' ').trim();

describe('lexique de l’univers Serge Belmont', () => {
  it('toutes les entrées ont une définition', () => expect(univers.filter((e) => !e.definition).map((e) => e.affichage)).toEqual([]));
  it('orthographe, accents, longueur des définitions, doublons', () => {
    expect(controlerLexique(univers, options.dictionnaire, options.nomsPropres)).toEqual([]);
  });
  it('une définition entre guillemets complète un vrai titre ou une vraie citation', () => {
    const sources = [...TITRES, ...CITATIONS].map(simple);
    for (const e of univers) {
      const m = e.definition.match(/«\s*(.+?)\s*»/);
      if (!m) continue;
      const complete = simple(m[1].replace('…', e.affichage));
      expect(sources.some((s) => s.includes(complete)), `${e.affichage} : « ${m[1]} »`).toBe(true);
    }
  });
});

describe('grilles de l’univers Serge Belmont', () => {
  it('il y en a au moins cinq', () => expect(fichiers.length).toBeGreaterThanOrEqual(5));

  it.each(fichiers)('%s : validée, sans avertissement, cases noires déclarées', (f) => {
    const d = lire(f);
    const r = validerGrille(d, options);
    expect(r.erreurs).toEqual([]);
    expect(r.avertissements).toEqual([]);
    expect(d.theme).toBe('serge-belmont');
    const { grille } = construireGrille(d);
    expect(grille.cases.filter((c) => c.type === 'vide').length).toBe(d.casesNoires ?? 0);
  });

  it.each(fichiers)('%s : se joue jusqu’au bout', (f) => {
    const { grille: g, erreurs } = construireGrille(lire(f));
    expect(erreurs).toEqual([]);
    let p: Partie = creerPartie(g);
    for (const m of g.mots) p = jouerMot(g, p, m.id);
    expect(estTerminee(g, p)).toBe(true);
  });

  it.each(fichiers)('%s : au moins un tiers des mots vient de l’univers', (f) => {
    const d = lire(f);
    const n = d.mots.filter((m) => motsUnivers.has(m.reponse)).length;
    expect(n / d.mots.length).toBeGreaterThanOrEqual(1 / 3);
  });

  it('le nom, le prénom et l’EP figurent parmi les réponses', () => {
    const reponses = new Set(fichiers.flatMap((f) => lire(f).mots.map((m) => m.reponse)));
    for (const mot of ['SERGE', 'BELMONT', 'NOSTALGIA']) expect(reponses.has(mot), mot).toBe(true);
  });

  it('aucun mot n’apparaît plus de deux fois dans l’univers', () => {
    const n = new Map<string, number>();
    for (const f of fichiers) for (const m of lire(f).mots) n.set(m.reponse, (n.get(m.reponse) ?? 0) + 1);
    expect([...n].filter(([, k]) => k > 2)).toEqual([]);
  });
});

describe('cases noires', () => {
  const treillis = lire(fichiers[0]);
  it('non déclarées, elles sont signalées', () => {
    const { casesNoires: _oubli, ...sans } = treillis;
    void _oubli;
    expect(validerGrille(sans, options).avertissements.map((a) => a.code)).toContain('A-CASES-VIDES');
  });
  it('un nombre déclaré faux est signalé', () => {
    expect(validerGrille({ ...treillis, casesNoires: 1 }, options).avertissements.map((a) => a.code)).toContain('A-CASES-VIDES');
  });
  it('une valeur absurde est refusée', () => {
    expect(validerGrille({ ...treillis, casesNoires: -2 }, options).erreurs.map((e) => e.code)).toContain('E-FORMAT');
  });
  it('une grille pleine n’a rien à déclarer', () => {
    expect(validerGrille(base, options).avertissements).toEqual([]);
  });
});

describe('récompense « Fan de Serge »', () => {
  const grilles = [{ id: '001', difficulte: 'facile' }];
  const ids = fichiers.map((f) => f.replace('.json', ''));
  const obtenue = (s: ReturnType<typeof sauvegardeVide>) => recompenses(s, grilles, '2026-11-16', ids).find((r) => r.id === 'belmont')!.obtenue;
  it('seulement quand toutes les grilles de l’univers sont terminées', () => {
    let s = sauvegardeVide();
    expect(obtenue(s)).toBe(false);
    for (const id of ids.slice(0, -1)) s = terminerGrille(s, { cle: id, idGrille: id, defiDuJour: null, indices: 0, secondes: 99 });
    expect(obtenue(s)).toBe(false);
    const dernier = ids[ids.length - 1];
    s = terminerGrille(s, { cle: dernier, idGrille: dernier, defiDuJour: null, indices: 0, secondes: 99 });
    expect(obtenue(s)).toBe(true);
  });
});
