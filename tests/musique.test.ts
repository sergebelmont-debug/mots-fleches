import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Lecteur, type ElementAudio, type Environnement } from '../src/musique/lecteur';
import { cibleMusique, MUSIQUES } from '../src/musique/pistes';
import { charger, sauvegardeVide, type Stockage } from '../src/storage/sauvegarde';

const IDS = readdirSync('grilles').filter((f) => /^\d+\.json$/.test(f)).map((f) => f.replace('.json', '')).sort();
const style = (p: string) => p.replace(/-\d+$/, '');
const ambiance = (p: string) => (['soir-d-ete', 'soiree-de-paris'].includes(style(p)) ? 'soiree' : style(p));
const parNiveau = IDS.map((id) => MUSIQUES.niveaux[id]);

describe('répartition des musiques', () => {
  it('chaque niveau du parcours a une musique, dont le fichier existe', () => {
    expect(parNiveau.every(Boolean)).toBe(true);
    for (const p of new Set([...parNiveau, MUSIQUES.menu])) expect(existsSync(`public/musique/${p}.mp3`), p).toBe(true);
  });
  it('Nuit Douce est la musique du menu, et ne sert qu’à un seul niveau, pas au début', () => {
    expect(MUSIQUES.menu).toBe('nuit-douce');
    const niveaux = parNiveau.map((p, i) => [p, i + 1] as const).filter(([p]) => p === 'nuit-douce');
    expect(niveaux).toHaveLength(1);
    expect(niveaux[0][1]).toBeGreaterThanOrEqual(5);
  });
  it('les 26 morceaux fournis sont tous utilisés', () => {
    expect(new Set(parNiveau).size).toBe(readdirSync('public/musique').filter((f) => f.endsWith('.mp3')).length);
  });
  it('deux niveaux qui se suivent n’ont jamais le même style ni la même ambiance', () => {
    for (let i = 1; i < parNiveau.length; i++) expect(ambiance(parNiveau[i]), `niveaux ${i} et ${i + 1}`).not.toBe(ambiance(parNiveau[i - 1]));
  });
  it('un même style ne revient pas avant 3 niveaux', () => {
    for (let i = 2; i < parNiveau.length; i++) expect(style(parNiveau[i]), `niveaux ${i - 1} et ${i + 1}`).not.toBe(style(parNiveau[i - 2]));
  });
  it('un morceau joué deux fois l’est à au moins 15 niveaux d’écart', () => {
    const niveaux = new Map<string, number[]>();
    parNiveau.forEach((p, i) => niveaux.set(p, [...(niveaux.get(p) ?? []), i + 1]));
    for (const [p, l] of niveaux) {
      expect(l.length, p).toBeLessThanOrEqual(2);
      if (l.length === 2) expect(l[1] - l[0], p).toBeGreaterThanOrEqual(15);
    }
  });
  it('le menu et les grilles Serge Belmont jouent Nuit Douce ; un niveau joue sa musique', () => {
    expect(cibleMusique(null)).toEqual({ type: 'menu', piste: 'nuit-douce' });
    expect(cibleMusique({ id: 'B01', cle: 'B01' })).toEqual({ type: 'menu', piste: 'nuit-douce' });
    expect(cibleMusique({ id: '007', cle: '007' })).toEqual({ type: 'niveau', piste: MUSIQUES.niveaux['007'], cle: '007' });
  });
});

// ---- Lecteur, avec un faux navigateur ----
class FauxAudio implements ElementAudio {
  src = '';
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  preload = '';
  refuser = false;
  play() {
    if (this.refuser) return Promise.reject(new Error('NotAllowedError'));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
function monter() {
  const audios: FauxAudio[] = [];
  let geste: (() => void) | null = null;
  let visibilite: ((v: boolean) => void) | null = null;
  const env: Environnement = {
    creerAudio: () => {
      const a = new FauxAudio();
      audios.push(a);
      return a;
    },
    auPremierGeste: (f) => (geste = f),
    surVisibilite: (f) => (visibilite = f),
  };
  const l = new Lecteur(env, (p) => `musique/${p}.mp3`);
  const [menu, niveau] = audios;
  return { l, menu, niveau, geste: () => geste?.(), visible: (v: boolean) => visibilite?.(v) };
}
const attendre = () => new Promise((r) => setTimeout(r, 0));
const MENU = { type: 'menu', piste: 'nuit-douce' } as const;

describe('lecteur de musique', () => {
  it('le menu joue en boucle Nuit Douce', () => {
    const { l, menu, niveau } = monter();
    l.jouer(MENU);
    expect(menu.src).toBe('musique/nuit-douce.mp3');
    expect(menu.loop).toBe(true);
    expect(menu.paused).toBe(false);
    expect(niveau.paused).toBe(true);
  });

  it('changer d’écran de menu ne fait pas recommencer la musique', () => {
    const { l, menu } = monter();
    l.jouer(MENU);
    menu.currentTime = 42;
    l.jouer({ ...MENU }); // parcours, classement, réglages… : même cible
    expect(menu.currentTime).toBe(42);
    expect(menu.paused).toBe(false);
  });

  it('un niveau joue sa musique depuis le début, et le menu reprend où il en était', () => {
    const { l, menu, niveau } = monter();
    l.jouer(MENU);
    menu.currentTime = 42;
    l.jouer({ type: 'niveau', piste: 'rue-de-la-pluie', cle: '004' });
    expect(menu.paused).toBe(true);
    expect(niveau.src).toBe('musique/rue-de-la-pluie.mp3');
    expect(niveau.currentTime).toBe(0);
    expect(niveau.paused).toBe(false);
    niveau.currentTime = 30;
    l.jouer(MENU);
    expect(niveau.paused).toBe(true);
    expect(menu.paused).toBe(false);
    expect(menu.currentTime).toBe(42);
  });

  it('chaque nouveau niveau repart du début, même avec le même morceau', () => {
    const { l, niveau } = monter();
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' });
    niveau.currentTime = 50;
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' }); // simple nouvel affichage : on continue
    expect(niveau.currentTime).toBe(50);
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '024' }); // autre niveau : on recommence
    expect(niveau.currentTime).toBe(0);
  });

  it('le réglage coupe et relance la musique', () => {
    const { l, menu } = monter();
    l.jouer(MENU);
    l.activer(false);
    expect(menu.paused).toBe(true);
    l.activer(true);
    expect(menu.paused).toBe(false);
  });

  it('musique coupée dès le départ : rien ne joue', () => {
    const { l, menu, niveau } = monter();
    l.activer(false);
    l.jouer(MENU);
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' });
    expect(menu.paused && niveau.paused).toBe(true);
  });

  it('lecture refusée par le navigateur : elle démarre au premier geste du joueur', async () => {
    const { l, menu, geste } = monter();
    menu.refuser = true;
    l.jouer(MENU);
    await attendre();
    expect(menu.paused).toBe(true);
    menu.refuser = false;
    geste();
    expect(menu.paused).toBe(false);
  });

  it('se met en pause quand le jeu n’est plus visible, et reprend ensuite', () => {
    const { l, menu, visible } = monter();
    l.jouer(MENU);
    visible(false);
    expect(menu.paused).toBe(true);
    visible(true);
    expect(menu.paused).toBe(false);
  });
});

describe('réglage Musique dans la sauvegarde', () => {
  const faux = (contenu: string): Stockage => ({ getItem: () => contenu, setItem: () => undefined });
  it('activée par défaut, y compris pour une ancienne sauvegarde', () => {
    expect(sauvegardeVide().reglages.musique).toBe(true);
    expect(charger(faux(JSON.stringify({ version: 1, reglages: { signalerMotsJustes: false } }))).reglages.musique).toBe(true);
  });
  it('le choix « coupée » est conservé', () => {
    expect(charger(faux(JSON.stringify({ version: 1, reglages: { musique: false } }))).reglages.musique).toBe(false);
  });
});
