// Statistiques personnelles : jours de jeu, séries, temps, taux de réussite.
// Fonctions pures.
import type { Sauvegarde } from '../storage/sauvegarde';

export interface Stats {
  jours: string[]; // jours où le jeu a été ouvert, au format AAAA-MM-JJ, triés
  partiesTerminees: number; // toutes les grilles finies, rejouées et défis compris
  secondesTotal: number;
  indicesTotal: number;
}

export const statsVides = (): Stats => ({ jours: [], partiesTerminees: 0, secondesTotal: 0, indicesTotal: 0 });

/** Date locale du joueur au format AAAA-MM-JJ. */
export function dateDuJour(d: Date): string {
  const deux = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

export function veille(jour: string): string {
  const d = new Date(`${jour}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Note qu'on a joué ce jour-là (une seule fois par jour ; on garde les 400 derniers). */
export function enregistrerJour(s: Stats, jour: string): Stats {
  if (s.jours.includes(jour)) return s;
  return { ...s, jours: [...s.jours, jour].sort().slice(-400) };
}

/** Série de jours consécutifs : en cours (encore vivante si on a joué hier) et record. */
export function serie(jours: string[], aujourdhui: string): { actuelle: number; record: number } {
  const ens = new Set(jours);
  let depart = ens.has(aujourdhui) ? aujourdhui : veille(aujourdhui);
  let actuelle = 0;
  while (ens.has(depart)) {
    actuelle++;
    depart = veille(depart);
  }
  let record = 0;
  for (const j of ens) {
    if (ens.has(veille(j))) continue; // on ne compte qu'à partir du premier jour d'une série
    let n = 0;
    const lendemain = (x: string) => {
      const d = new Date(`${x}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    };
    for (let k = j; ens.has(k); k = lendemain(k)) n++;
    record = Math.max(record, n);
  }
  return { actuelle, record };
}

/** 125 → « 2 min 05 » ; 3725 → « 1 h 02 min ». */
export function formaterDuree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`;
}

/** Chronomètre : 125 → « 2:05 ». */
export const formaterChrono = (secondes: number): string => `${Math.floor(secondes / 60)}:${String(Math.floor(secondes % 60)).padStart(2, '0')}`;

export interface Resume {
  terminees: number;
  total: number;
  etoiles: number;
  etoilesMax: number;
  sansIndice: number;
  tauxSansIndice: number; // en %, parmi les grilles terminées
  tempsMoyen: number | null; // meilleur temps moyen par grille du parcours
  meilleurTemps: number | null;
  partiesTerminees: number;
  tempsTotal: number;
  indicesTotal: number;
  serieActuelle: number;
  serieRecord: number;
  defisReleves: number;
}

export function resumer(s: Sauvegarde, ids: string[], aujourdhui: string): Resume {
  const resultats = ids.map((id) => s.progression.terminees[id]).filter((r) => !!r);
  const temps = resultats.map((r) => r.secondes).filter((t): t is number => typeof t === 'number');
  const sansIndice = resultats.filter((r) => r.indices === 0).length;
  const { actuelle, record } = serie(s.stats.jours, aujourdhui);
  return {
    terminees: resultats.length,
    total: ids.length,
    etoiles: resultats.reduce((n, r) => n + r.etoiles, 0),
    etoilesMax: ids.length * 3,
    sansIndice,
    tauxSansIndice: resultats.length ? Math.round((sansIndice / resultats.length) * 100) : 0,
    tempsMoyen: temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null,
    meilleurTemps: temps.length ? Math.min(...temps) : null,
    partiesTerminees: s.stats.partiesTerminees,
    tempsTotal: s.stats.secondesTotal,
    indicesTotal: s.stats.indicesTotal,
    serieActuelle: actuelle,
    serieRecord: record,
    defisReleves: Object.keys(s.defis).length,
  };
}
