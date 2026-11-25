// Quelle musique joue où. Les données viennent de donnees/musiques.json
// (fichier produit par outils/repartir-musiques.cjs ; les MP3 sont dans public/musique/).
import donnees from '../../donnees/musiques.json';
import { environnementNavigateur, Lecteur, type Cible } from './lecteur';

export const MUSIQUES = donnees as { menu: string; titres: Record<string, string>; niveaux: Record<string, string> };

export const cheminPiste = (piste: string) => `musique/${piste}.mp3`;

/**
 * Musique d'un écran :
 * - un niveau du parcours (ou le défi du jour, qui reprend la grille d'un niveau) a sa propre musique ;
 * - tout le reste (menus, classement, réglages, statistiques… et pour l'instant les grilles
 *   Serge Belmont) garde la musique du menu, sans la faire recommencer.
 */
export function cibleMusique(niveau: { id: string; cle: string } | null): Cible {
  const piste = niveau ? MUSIQUES.niveaux[niveau.id] : undefined;
  return niveau && piste ? { type: 'niveau', piste, cle: niveau.cle } : { type: 'menu', piste: MUSIQUES.menu };
}

let unique: Lecteur | null = null;
/** Un seul lecteur pour toute la page (créé au premier besoin). */
export function lecteur(): Lecteur {
  unique ??= new Lecteur(environnementNavigateur(), cheminPiste);
  return unique;
}
