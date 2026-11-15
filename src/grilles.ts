// Charge automatiquement toutes les grilles du dossier grilles/.
// Ajouter un fichier suffit : aucun code à modifier.
import { construireGrille, type DonneesGrille, type Grille } from './engine/grille';

const fichiers = import.meta.glob<DonneesGrille>('../grilles/*.json', { eager: true, import: 'default' });

export const GRILLES: Grille[] = Object.values(fichiers)
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((d) => {
    const { grille, erreurs } = construireGrille(d);
    if (erreurs.length > 0) throw new Error(`Grille ${d.id} invalide : ${erreurs.join(' ; ')}`);
    return grille;
  });

export const IDS = GRILLES.map((g) => g.id);
