import { createCipheriv, randomBytes } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dechiffrer } from '../src/musique/chiffre';
import { Lecteur, type ElementAudio, type Environnement } from '../src/musique/lecteur';
import { cibleMusique, MUSIQUES } from '../src/musique/pistes';
import { charger, sauvegardeVide, type Stockage } from '../src/storage/sauvegarde';

const IDS = readdirSync('grilles').filter((f) => /^\d+\.json$/.test(f)).map((f) => f.replace('.json', '')).sort();
const style = (p: string) => p.replace(/-\d+$/, '');
const ambiance = (p: string) => (['soir-d-ete', 'soiree-de-paris'].includes(style(p)) ? 'soiree' : style(p));
const parNiveau = IDS.map((id) => MUSIQUES.niveaux[id]);

describe('protection des musiques', () => {
  it('aucun fichier audio en clair n’est publié : seulement des fichiers chiffrés', () => {
    const fichiers = readdirSync('public/musique');
    expect(fichiers.filter((f) => !f.endsWith('.bin'))).toEqual([]);
    expect(fichiers.length).toBe(26);
  });
  it('un fichier chiffré se déchiffre avec la bonne clé, et pas avec une autre', async () => {
    const cle = randomBytes(32);
    const iv = randomBytes(12);
    const clair = Buffer.from('ID3 — morceau de démonstration');
    const c = createCipheriv('aes-256-gcm', cle, iv);
    const fichier = Buffer.concat([iv, c.update(clair), c.final(), c.getAuthTag()]);
    const tampon = fichier.buffer.slice(fichier.byteOffset, fichier.byteOffset + fichier.byteLength);
    expect(Buffer.from(await dechiffrer(tampon, cle.toString('base64')))).toEqual(clair);
    await expect(dechiffrer(tampon, randomBytes(32).toString('base64'))).rejects.toThrow();
  });
});

describe('répartition des musiques', () => {
  it('chaque niveau du parcours a une musique, dont le fichier existe', () => {
    expect(parNiveau.every(Boolean)).toBe(true);
    for (const p of new Set([...parNiveau, MUSIQUES.menu])) expect(existsSync(`public/musique/${p}.bin`), p).toBe(true);
  });
  it('Nuit Douce est la musique du menu, et ne sert qu’à un seul niveau, pas au début', () => {
    expect(MUSIQUES.menu).toBe('nuit-douce');
    const niveaux = parNiveau.map((p, i) => [p, i + 1] as const).filter(([p]) => p === 'nuit-douce');
    expect(niveaux).toHaveLength(1);
    expect(niveaux[0][1]).toBeGreaterThanOrEqual(5);
  });
  it('les 26 morceaux fournis sont tous utilisés', () => {
    expect(new Set(parNiveau).size).toBe(readdirSync('public/musique').filter((f) => f.endsWith('.bin')).length);
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

// ---- Lecteur, avec un faux navigateur : les morceaux arrivent de façon asynchrone, comme après déchiffrement ----
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
  const l = new Lecteur(env, (p) => Promise.resolve(`blob:${p}`));
  const [menu, niveau] = audios;
  return { l, menu, niveau, geste: () => geste?.(), visible: (v: boolean) => visibilite?.(v) };
}
const attendre = () => new Promise((r) => setTimeout(r, 0));
const MENU = { type: 'menu', piste: 'nuit-douce' } as const;

describe('lecteur de musique', () => {
  it('le menu joue en boucle Nuit Douce', async () => {
    const { l, menu, niveau } = monter();
    l.jouer(MENU);
    await attendre();
    expect(menu.src).toBe('blob:nuit-douce');
    expect(menu.loop).toBe(true);
    expect(menu.paused).toBe(false);
    expect(niveau.paused).toBe(true);
  });

  it('changer d’écran de menu ne fait pas recommencer la musique', async () => {
    const { l, menu } = monter();
    l.jouer(MENU);
    await attendre();
    menu.currentTime = 42;
    l.jouer({ ...MENU }); // parcours, classement, réglages… : même cible
    await attendre();
    expect(menu.currentTime).toBe(42);
    expect(menu.paused).toBe(false);
  });

  it('un niveau joue sa musique depuis le début, et le menu reprend où il en était', async () => {
    const { l, menu, niveau } = monter();
    l.jouer(MENU);
    await attendre();
    menu.currentTime = 42;
    l.jouer({ type: 'niveau', piste: 'rue-de-la-pluie', cle: '004' });
    expect(menu.paused).toBe(true); // coupé tout de suite, sans attendre le nouveau morceau
    await attendre();
    expect(niveau.src).toBe('blob:rue-de-la-pluie');
    expect(niveau.currentTime).toBe(0);
    expect(niveau.paused).toBe(false);
    niveau.currentTime = 30;
    l.jouer(MENU);
    await attendre();
    expect(niveau.paused).toBe(true);
    expect(menu.paused).toBe(false);
    expect(menu.currentTime).toBe(42);
  });

  it('pendant le chargement d’un niveau, l’ancien morceau de niveau ne rejoue pas', async () => {
    const { l, niveau } = monter();
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' });
    await attendre();
    l.jouer(MENU);
    await attendre();
    l.jouer({ type: 'niveau', piste: 'rue-de-la-pluie', cle: '008' });
    expect(niveau.paused).toBe(true); // l'élément contient encore « soir-d-ete » : il reste muet
    await attendre();
    expect(niveau.src).toBe('blob:rue-de-la-pluie');
    expect(niveau.paused).toBe(false);
  });

  it('si le joueur change d’écran pendant un chargement, seul le dernier choix compte', async () => {
    const { l, menu, niveau } = monter();
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' });
    l.jouer(MENU);
    await attendre();
    expect(niveau.src).toBe('');
    expect(menu.paused).toBe(false);
  });

  it('chaque nouveau niveau repart du début, même avec le même morceau', async () => {
    const { l, niveau } = monter();
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' });
    await attendre();
    niveau.currentTime = 50;
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' }); // simple nouvel affichage : on continue
    await attendre();
    expect(niveau.currentTime).toBe(50);
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '024' }); // autre niveau : on recommence
    await attendre();
    expect(niveau.currentTime).toBe(0);
  });

  it('le volume s’applique aux deux lecteurs, borné entre 0 et 1', () => {
    const { l, menu, niveau } = monter();
    l.regler(0.3);
    expect([menu.volume, niveau.volume]).toEqual([0.3, 0.3]);
    l.regler(7);
    expect(menu.volume).toBe(1);
    l.regler(-1);
    expect(niveau.volume).toBe(0);
  });

  it('le réglage coupe et relance la musique', async () => {
    const { l, menu } = monter();
    l.jouer(MENU);
    await attendre();
    l.activer(false);
    expect(menu.paused).toBe(true);
    l.activer(true);
    expect(menu.paused).toBe(false);
  });

  it('musique coupée dès le départ : rien ne joue', async () => {
    const { l, menu, niveau } = monter();
    l.activer(false);
    l.jouer(MENU);
    l.jouer({ type: 'niveau', piste: 'soir-d-ete', cle: '007' });
    await attendre();
    expect(menu.paused && niveau.paused).toBe(true);
  });

  it('morceau impossible à obtenir (clé absente) : pas d’erreur, rien ne joue', async () => {
    const env: Environnement = { creerAudio: () => new FauxAudio(), auPremierGeste: () => undefined, surVisibilite: () => undefined };
    const l = new Lecteur(env, () => Promise.reject(new Error('Clé des musiques absente')));
    expect(() => l.jouer(MENU)).not.toThrow();
    await attendre();
  });

  it('lecture refusée par le navigateur : elle démarre au premier geste du joueur', async () => {
    const { l, menu, geste } = monter();
    menu.refuser = true;
    l.jouer(MENU);
    await attendre();
    await attendre();
    expect(menu.paused).toBe(true);
    menu.refuser = false;
    geste();
    expect(menu.paused).toBe(false);
  });

  it('se met en pause quand le jeu n’est plus visible, et reprend ensuite', async () => {
    const { l, menu, visible } = monter();
    l.jouer(MENU);
    await attendre();
    visible(false);
    expect(menu.paused).toBe(true);
    visible(true);
    expect(menu.paused).toBe(false);
  });
});

describe('réglages Musique et volume dans la sauvegarde', () => {
  const faux = (contenu: string): Stockage => ({ getItem: () => contenu, setItem: () => undefined });
  it('musique activée par défaut, y compris pour une ancienne sauvegarde', () => {
    expect(sauvegardeVide().reglages.musique).toBe(true);
    expect(charger(faux(JSON.stringify({ version: 1, reglages: { signalerMotsJustes: false } }))).reglages.musique).toBe(true);
  });
  it('volume à 60 % par défaut ; une valeur abîmée revient à 60 %', () => {
    expect(sauvegardeVide().reglages.volume).toBe(0.6);
    expect(charger(faux(JSON.stringify({ version: 1, reglages: { volume: 0.25 } }))).reglages.volume).toBe(0.25);
    for (const v of [3, -1, 'fort', null]) expect(charger(faux(JSON.stringify({ version: 1, reglages: { volume: v } }))).reglages.volume).toBe(0.6);
  });
  it('le choix « coupée » est conservé', () => {
    expect(charger(faux(JSON.stringify({ version: 1, reglages: { musique: false } }))).reglages.musique).toBe(false);
  });
});
