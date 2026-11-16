// Récompenses (médailles) : calculées à partir de la sauvegarde, jamais stockées.
// Ajouter une médaille = ajouter une ligne dans la liste ci-dessous.
import type { Sauvegarde } from '../storage/sauvegarde';
import { serie } from './statistiques';

export interface Recompense {
  id: string;
  titre: string;
  description: string;
  obtenue: boolean;
}

interface Contexte {
  terminees: number;
  etoiles: number;
  troisEtoiles: number;
  sansIndice: number;
  meilleurTemps: number;
  serieRecord: number;
  defis: number;
  finies: (difficulte: string) => boolean;
  belmont: boolean; // toutes les grilles de l'univers Serge Belmont terminées
}

const LISTE: { id: string; titre: string; description: string; test: (c: Contexte) => boolean }[] = [
  { id: 'premier-pas', titre: 'Premier pas', description: 'Terminer une grille', test: (c) => c.terminees >= 1 },
  { id: 'cinq', titre: 'Habitué', description: 'Terminer 5 grilles', test: (c) => c.terminees >= 5 },
  { id: 'quinze', titre: 'Passionné', description: 'Terminer 15 grilles', test: (c) => c.terminees >= 15 },
  { id: 'trente', titre: 'Cruciverbiste', description: 'Terminer 30 grilles', test: (c) => c.terminees >= 30 },
  { id: 'sans-filet', titre: 'Sans filet', description: 'Terminer une grille sans indice', test: (c) => c.sansIndice >= 1 },
  { id: 'perfectionniste', titre: 'Perfectionniste', description: 'Obtenir 3 étoiles sur 10 grilles', test: (c) => c.troisEtoiles >= 10 },
  { id: 'etoiles-30', titre: 'Ciel étoilé', description: 'Gagner 30 étoiles', test: (c) => c.etoiles >= 30 },
  { id: 'etoiles-60', titre: 'Voie lactée', description: 'Gagner 60 étoiles', test: (c) => c.etoiles >= 60 },
  { id: 'eclair', titre: 'Éclair', description: 'Terminer une grille en moins de 2 minutes', test: (c) => c.meilleurTemps < 120 },
  { id: 'facile', titre: 'Échauffement terminé', description: 'Terminer toutes les grilles faciles', test: (c) => c.finies('facile') },
  { id: 'intermediaire', titre: 'Cap franchi', description: 'Terminer toutes les grilles intermédiaires', test: (c) => c.finies('intermediaire') },
  { id: 'difficile', titre: 'Au sommet', description: 'Terminer toutes les grilles difficiles', test: (c) => c.finies('difficile') },
  { id: 'belmont', titre: 'Fan de Serge', description: 'Terminer les grilles Serge Belmont', test: (c) => c.belmont },
  { id: 'fidele', titre: 'Fidèle', description: 'Jouer 3 jours de suite', test: (c) => c.serieRecord >= 3 },
  { id: 'assidu', titre: 'Assidu', description: 'Jouer 7 jours de suite', test: (c) => c.serieRecord >= 7 },
  { id: 'defi', titre: 'Défi relevé', description: 'Réussir un défi du jour', test: (c) => c.defis >= 1 },
  { id: 'sept-defis', titre: 'Semaine de défis', description: 'Réussir 7 défis du jour', test: (c) => c.defis >= 7 },
];

export function recompenses(
  s: Sauvegarde,
  grilles: { id: string; difficulte: string }[],
  aujourdhui: string,
  idsBelmont: string[] = [],
): Recompense[] {
  const resultats = grilles.map((g) => s.progression.terminees[g.id]).filter((r) => !!r);
  const temps = [...resultats.map((r) => r.secondes), ...Object.values(s.defis).map((d) => d.secondes)].filter(
    (t): t is number => typeof t === 'number' && t > 0,
  );
  const c: Contexte = {
    terminees: resultats.length,
    etoiles: resultats.reduce((n, r) => n + r.etoiles, 0),
    troisEtoiles: resultats.filter((r) => r.etoiles === 3).length,
    sansIndice: resultats.filter((r) => r.indices === 0).length + Object.values(s.defis).filter((d) => d.indices === 0).length,
    meilleurTemps: temps.length ? Math.min(...temps) : Infinity,
    serieRecord: serie(s.stats.jours, aujourdhui).record,
    defis: Object.keys(s.defis).length,
    belmont: idsBelmont.length > 0 && idsBelmont.every((id) => !!s.progression.terminees[id]),
    finies: (dif) => {
      const groupe = grilles.filter((g) => g.difficulte === dif);
      return groupe.length > 0 && groupe.every((g) => !!s.progression.terminees[g.id]);
    },
  };
  return LISTE.map(({ test, ...r }) => ({ ...r, obtenue: test(c) }));
}

/** Titres des récompenses obtenues entre deux états de la sauvegarde. */
export function nouvellesRecompenses(avant: Recompense[], apres: Recompense[]): string[] {
  const deja = new Set(avant.filter((r) => r.obtenue).map((r) => r.id));
  return apres.filter((r) => r.obtenue && !deja.has(r.id)).map((r) => r.titre);
}
