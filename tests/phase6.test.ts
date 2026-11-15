import { describe, expect, it } from 'vitest';
import { cleDefi, grilleDuDefi, terminerGrille } from '../src/progression/defi';
import { enregistrerResultat, progressionVide } from '../src/progression/progression';
import { nouvellesRecompenses, recompenses } from '../src/progression/recompenses';
import { dateDuJour, enregistrerJour, formaterChrono, formaterDuree, resumer, serie, statsVides, veille } from '../src/progression/statistiques';
import { charger, CLE, enregistrer, sauvegardeVide, type Sauvegarde, type Stockage } from '../src/storage/sauvegarde';

const ids = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(3, '0'));
const grilles = ids.map((id, i) => ({ id, difficulte: i < 15 ? 'facile' : i < 24 ? 'intermediaire' : 'difficile' }));
const JOUR = '2026-11-16';
const obtenues = (s: Sauvegarde) => recompenses(s, grilles, JOUR).filter((r) => r.obtenue).map((r) => r.id);
const finir = (s: Sauvegarde, id: string, indices = 0, secondes = 200): Sauvegarde =>
  terminerGrille(s, { cle: id, idGrille: id, defiDuJour: null, indices, secondes });

describe('dates et séries de jours', () => {
  it('formate la date locale', () => expect(dateDuJour(new Date(2026, 0, 5))).toBe('2026-01-05'));
  it('calcule la veille, y compris en changeant de mois et d’année', () => {
    expect(veille('2026-11-16')).toBe('2026-11-15');
    expect(veille('2026-03-01')).toBe('2026-02-28');
    expect(veille('2026-01-01')).toBe('2025-12-31');
  });
  it('ne compte qu’une fois le même jour', () => {
    let s = enregistrerJour(statsVides(), JOUR);
    s = enregistrerJour(s, JOUR);
    expect(s.jours).toEqual([JOUR]);
  });
  it('série en cours : jours consécutifs jusqu’à aujourd’hui', () => {
    expect(serie(['2026-11-14', '2026-11-15', '2026-11-16'], JOUR)).toEqual({ actuelle: 3, record: 3 });
  });
  it('la série reste vivante si on a joué hier mais pas encore aujourd’hui', () => {
    expect(serie(['2026-11-14', '2026-11-15'], JOUR).actuelle).toBe(2);
  });
  it('la série retombe à zéro après un jour manqué, le record reste', () => {
    expect(serie(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-14'], JOUR)).toEqual({ actuelle: 0, record: 3 });
  });
  it('aucun jour : tout à zéro', () => expect(serie([], JOUR)).toEqual({ actuelle: 0, record: 0 }));
});

describe('durées', () => {
  it('formate les durées lisibles', () => {
    expect(formaterDuree(45)).toBe('45 s');
    expect(formaterDuree(125)).toBe('2 min 05');
    expect(formaterDuree(3725)).toBe('1 h 02 min');
  });
  it('formate le chronomètre', () => {
    expect(formaterChrono(0)).toBe('0:00');
    expect(formaterChrono(125)).toBe('2:05');
  });
});

describe('défi du jour', () => {
  it('donne la même grille pour une même date', () => expect(grilleDuDefi(ids, JOUR)).toBe(grilleDuDefi(ids, JOUR)));
  it('donne toujours une grille existante', () => {
    for (let j = 1; j <= 28; j++) expect(ids).toContain(grilleDuDefi(ids, `2026-02-${String(j).padStart(2, '0')}`));
  });
  it('varie d’un jour à l’autre', () => {
    const tirages = new Set(Array.from({ length: 28 }, (_, j) => grilleDuDefi(ids, `2026-02-${String(j + 1).padStart(2, '0')}`)));
    expect(tirages.size).toBeGreaterThan(10);
  });
  it('un défi réussi est enregistré sans toucher au parcours', () => {
    const s = terminerGrille(sauvegardeVide(), { cle: cleDefi(JOUR), idGrille: '020', defiDuJour: JOUR, indices: 1, secondes: 90 });
    expect(s.defis[JOUR]).toEqual({ etoiles: 2, indices: 1, secondes: 90 });
    expect(s.progression.terminees).toEqual({});
  });
  it('rejouer le défi garde le meilleur résultat', () => {
    const fin = { cle: cleDefi(JOUR), idGrille: '020', defiDuJour: JOUR };
    let s = terminerGrille(sauvegardeVide(), { ...fin, indices: 0, secondes: 300 });
    s = terminerGrille(s, { ...fin, indices: 4, secondes: 60 });
    expect(s.defis[JOUR]).toEqual({ etoiles: 3, indices: 0, secondes: 300 });
    s = terminerGrille(s, { ...fin, indices: 0, secondes: 120 });
    expect(s.defis[JOUR].secondes).toBe(120);
  });
});

describe('fin de grille', () => {
  it('enregistre le résultat, efface la partie en cours et cumule les statistiques', () => {
    const depart = { ...sauvegardeVide(), enCours: { '001': {} as never, '002': {} as never } };
    const s = terminerGrille(depart, { cle: '001', idGrille: '001', defiDuJour: null, indices: 2, secondes: 100 });
    expect(s.progression.terminees['001']).toEqual({ etoiles: 2, indices: 2, secondes: 100 });
    expect(Object.keys(s.enCours)).toEqual(['002']);
    expect(s.stats).toMatchObject({ partiesTerminees: 1, secondesTotal: 100, indicesTotal: 2 });
  });
  it('garde le meilleur temps et les meilleures étoiles séparément', () => {
    let p = enregistrerResultat(progressionVide(), '001', 0, 300);
    p = enregistrerResultat(p, '001', 5, 100);
    expect(p.terminees['001']).toEqual({ etoiles: 3, indices: 0, secondes: 100 });
  });
});

describe('statistiques', () => {
  it('résume la progression', () => {
    let s = finir(sauvegardeVide(), '001', 0, 100);
    s = finir(s, '002', 3, 300);
    s = { ...s, stats: enregistrerJour(s.stats, JOUR) };
    expect(resumer(s, ids, JOUR)).toMatchObject({
      terminees: 2,
      total: 30,
      etoiles: 4,
      etoilesMax: 90,
      sansIndice: 1,
      tauxSansIndice: 50,
      tempsMoyen: 200,
      meilleurTemps: 100,
      partiesTerminees: 2,
      tempsTotal: 400,
      indicesTotal: 3,
      serieActuelle: 1,
    });
  });
  it('ne plante pas sans aucune partie', () => {
    expect(resumer(sauvegardeVide(), ids, JOUR)).toMatchObject({ terminees: 0, tauxSansIndice: 0, tempsMoyen: null, meilleurTemps: null });
  });
});

describe('récompenses', () => {
  it('aucune au départ', () => expect(obtenues(sauvegardeVide())).toEqual([]));
  it('la première grille sans indice en donne deux', () => {
    expect(obtenues(finir(sauvegardeVide(), '001'))).toEqual(['premier-pas', 'sans-filet']);
  });
  it('avec indices : pas de « Sans filet »', () => {
    expect(obtenues(finir(sauvegardeVide(), '001', 3))).toEqual(['premier-pas']);
  });
  it('« Éclair » demande moins de 2 minutes', () => {
    expect(obtenues(finir(sauvegardeVide(), '001', 0, 119))).toContain('eclair');
    expect(obtenues(finir(sauvegardeVide(), '001', 0, 120))).not.toContain('eclair');
  });
  it('terminer toutes les grilles faciles débloque la médaille, pas avant', () => {
    let s = sauvegardeVide();
    for (const id of ids.slice(0, 14)) s = finir(s, id);
    expect(obtenues(s)).not.toContain('facile');
    s = finir(s, '015');
    expect(obtenues(s)).toEqual(expect.arrayContaining(['facile', 'quinze', 'perfectionniste', 'etoiles-30']));
    expect(obtenues(s)).not.toContain('intermediaire');
  });
  it('tout terminer donne les médailles de grilles et d’étoiles', () => {
    let s = sauvegardeVide();
    for (const id of ids) s = finir(s, id);
    expect(obtenues(s)).toEqual(expect.arrayContaining(['trente', 'difficile', 'intermediaire', 'etoiles-60']));
  });
  it('les séries de jours et les défis donnent leurs médailles', () => {
    let s = sauvegardeVide();
    for (const j of ['2026-11-14', '2026-11-15', '2026-11-16']) s = { ...s, stats: enregistrerJour(s.stats, j) };
    expect(obtenues(s)).toEqual(['fidele']);
    s = terminerGrille(s, { cle: cleDefi(JOUR), idGrille: '005', defiDuJour: JOUR, indices: 2, secondes: 400 });
    expect(obtenues(s)).toEqual(['fidele', 'defi']);
  });
  it('repère les médailles nouvellement gagnées', () => {
    const avant = sauvegardeVide();
    const apres = finir(avant, '001');
    expect(nouvellesRecompenses(recompenses(avant, grilles, JOUR), recompenses(apres, grilles, JOUR))).toEqual(['Premier pas', 'Sans filet']);
    expect(nouvellesRecompenses(recompenses(apres, grilles, JOUR), recompenses(finir(apres, '002'), grilles, JOUR))).toEqual([]);
  });
});

describe('sauvegarde étendue', () => {
  const faux = (): Stockage & { d: Map<string, string> } => {
    const d = new Map<string, string>();
    return { d, getItem: (c) => d.get(c) ?? null, setItem: (c, v) => void d.set(c, v) };
  };
  it('relit défis, temps et statistiques', () => {
    const st = faux();
    let s = finir(sauvegardeVide(), '001', 1, 77);
    s = terminerGrille(s, { cle: cleDefi(JOUR), idGrille: '009', defiDuJour: JOUR, indices: 0, secondes: 50 });
    s = { ...s, stats: enregistrerJour(s.stats, JOUR) };
    enregistrer(st, s);
    expect(charger(st)).toEqual(s);
  });
  it('une ancienne sauvegarde (avant la phase 6) se charge sans perte', () => {
    const st = faux();
    st.d.set(CLE, JSON.stringify({ version: 1, progression: { terminees: { '001': { etoiles: 3, indices: 0 } } }, enCours: {}, reglages: { signalerMotsJustes: false } }));
    const s = charger(st);
    expect(s.progression.terminees).toEqual({ '001': { etoiles: 3, indices: 0 } });
    expect(s.reglages.signalerMotsJustes).toBe(false);
    expect(s.defis).toEqual({});
    expect(s.stats).toEqual(statsVides());
  });
  it('ignore des défis ou des statistiques abîmés', () => {
    const st = faux();
    st.d.set(CLE, JSON.stringify({ version: 1, defis: { hier: { etoiles: 3, indices: 0, secondes: 5 }, '2026-11-16': 'x' }, stats: { jours: ['n’importe quoi', '2026-11-16', 7], partiesTerminees: -4 } }));
    const s = charger(st);
    expect(s.defis).toEqual({});
    expect(s.stats).toEqual({ ...statsVides(), jours: ['2026-11-16'] });
  });
});
