// Charge automatiquement toutes les grilles du dossier grilles/.
// Ajouter un fichier suffit : aucun code à modifier.
import { construireGrille, type DonneesGrille, type Grille } from './engine/grille';

function construire(fichiers: Record<string, DonneesGrille>): Grille[] {
  return Object.values(fichiers)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => {
      const { grille, erreurs } = construireGrille(d);
      if (erreurs.length > 0) throw new Error(`Grille ${d.id} invalide : ${erreurs.join(' ; ')}`);
      return grille;
    });
}

/** Le parcours principal : grilles/001.json, 002.json… */
export const GRILLES = construire(import.meta.glob<DonneesGrille>('../grilles/*.json', { eager: true, import: 'default' }));
export const IDS = GRILLES.map((g) => g.id);

/** Les grilles spéciales de l'univers Serge Belmont : grilles/serge-belmont/B01.json… */
export const BELMONT = construire(import.meta.glob<DonneesGrille>('../grilles/serge-belmont/*.json', { eager: true, import: 'default' }));
export const IDS_BELMONT = BELMONT.map((g) => g.id);

/** Pochette associée à chaque grille de l'univers (fichiers de public/serge/). */
export const POCHETTES: Record<string, string> = {
  B01: 'serge/nostalgia.webp',
  B02: 'serge/l-odeur-des-orangers.webp',
  B03: 'serge/il-est-encore-temps.webp',
  B04: 'serge/sous-les-lampadaires.webp',
  B05: 'serge/le-marionnettiste.webp',
  B06: 'serge/le-village.webp',
};
