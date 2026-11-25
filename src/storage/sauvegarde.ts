// Sauvegarde locale (dans le navigateur) : progression, parties en cours, réglages.
import type { Partie } from '../engine/partie';
import { progressionVide, type Progression } from '../progression/progression';
import type { ResultatDefi } from '../progression/defi';
import { statsVides, type Stats } from '../progression/statistiques';

export interface Reglages {
  /** Faux (par défaut) : la grille entière tient à l'écran. Vrai : cases agrandies, la grille défile. */
  agrandirGrilles: boolean;
  /** Musique de fond (activée par défaut). */
  musique: boolean;
  /** Volume de la musique, de 0 à 1 (sans effet sur iPhone, où seul l'interrupteur compte). */
  volume: number;
}

export const VOLUME_PAR_DEFAUT = 0.6;

export interface Sauvegarde {
  version: 1;
  progression: Progression;
  enCours: Record<string, Partie>;
  reglages: Reglages;
  defis: Record<string, ResultatDefi>; // défis du jour réussis, par date
  stats: Stats;
}

/** Ce dont on a besoin du stockage du navigateur (permet de tester sans navigateur). */
export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

export const CLE = 'mots-fleches:v1';

export const sauvegardeVide = (): Sauvegarde => ({
  version: 1,
  progression: progressionVide(),
  enCours: {},
  reglages: { agrandirGrilles: false, musique: true, volume: VOLUME_PAR_DEFAUT },
  defis: {},
  stats: statsVides(),
});

const FORMAT_JOUR = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const nombre = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Lit la sauvegarde. Absente, illisible ou abîmée, elle donne une sauvegarde vide, jamais un plantage. */
export function charger(stockage: Stockage | null): Sauvegarde {
  const vide = sauvegardeVide();
  try {
    const brut = stockage?.getItem(CLE);
    if (!brut) return vide;
    const s = JSON.parse(brut) as unknown;
    if (!estObjet(s) || s.version !== 1) return vide;
    const terminees: Progression['terminees'] = {};
    const prog = estObjet(s.progression) && estObjet(s.progression.terminees) ? s.progression.terminees : {};
    for (const [id, r] of Object.entries(prog))
      if (estObjet(r) && Number.isInteger(r.etoiles) && Number.isInteger(r.indices))
        terminees[id] = {
          etoiles: Math.min(3, Math.max(1, r.etoiles as number)),
          indices: r.indices as number,
          ...(nombre(r.secondes) ? { secondes: r.secondes as number } : {}),
        };
    const defis: Sauvegarde['defis'] = {};
    for (const [jour, r] of Object.entries(estObjet(s.defis) ? s.defis : {}))
      if (FORMAT_JOUR.test(jour) && estObjet(r) && Number.isInteger(r.etoiles) && Number.isInteger(r.indices) && nombre(r.secondes))
        defis[jour] = { etoiles: Math.min(3, Math.max(1, r.etoiles as number)), indices: r.indices as number, secondes: r.secondes as number };
    const st = estObjet(s.stats) ? s.stats : {};
    return {
      version: 1,
      progression: { terminees },
      enCours: estObjet(s.enCours) ? (s.enCours as Record<string, Partie>) : {},
      reglages: {
        agrandirGrilles: estObjet(s.reglages) && s.reglages.agrandirGrilles === true,
        musique: !(estObjet(s.reglages) && s.reglages.musique === false),
        volume:
          estObjet(s.reglages) && nombre(s.reglages.volume) && (s.reglages.volume as number) <= 1 ? (s.reglages.volume as number) : VOLUME_PAR_DEFAUT,
      },
      defis,
      stats: {
        jours: Array.isArray(st.jours) ? st.jours.filter((j): j is string => typeof j === 'string' && FORMAT_JOUR.test(j)).sort() : [],
        partiesTerminees: nombre(st.partiesTerminees) ? (st.partiesTerminees as number) : 0,
        secondesTotal: nombre(st.secondesTotal) ? (st.secondesTotal as number) : 0,
        indicesTotal: nombre(st.indicesTotal) ? (st.indicesTotal as number) : 0,
      },
    };
  } catch {
    return vide;
  }
}

/** Écrit la sauvegarde. Renvoie faux si le navigateur refuse (navigation privée, stockage plein). */
export function enregistrer(stockage: Stockage | null, s: Sauvegarde): boolean {
  try {
    if (!stockage) return false;
    stockage.setItem(CLE, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/** Le stockage du navigateur, ou null s'il est indisponible. */
export function stockageNavigateur(): Stockage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
