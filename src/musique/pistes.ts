// Quelle musique joue où, et comment on l'obtient.
// Les données viennent de donnees/musiques.json (outils/repartir-musiques.cjs).
// Les morceaux sont publiés chiffrés (public/musique/*.bin, outils/chiffrer-musiques.cjs) : ils sont
// téléchargés, déchiffrés en mémoire, puis lus depuis une adresse locale (blob:). Aucun MP3 n'est en ligne.
import donnees from '../../donnees/musiques.json';
import { dechiffrer } from './chiffre';
import { environnementNavigateur, Lecteur, type Cible } from './lecteur';

export const MUSIQUES = donnees as { menu: string; titres: Record<string, string>; niveaux: Record<string, string> };

/** Clé injectée au moment de la construction du site (secret GitHub, ou fichier .env.local en local). */
const CLE: string | undefined = import.meta.env.VITE_MUSIQUE_CLE;

/** Morceaux déjà déchiffrés : celui du menu est gardé ; pour les niveaux, seuls les plus récents. */
const memoire = new Map<string, Promise<string>>();
const GARDES = 3;

export function urlPiste(piste: string): Promise<string> {
  const deja = memoire.get(piste);
  if (deja) {
    memoire.delete(piste);
    memoire.set(piste, deja); // le plus récent en dernier
    return deja;
  }
  if (!CLE) return Promise.reject(new Error('Clé des musiques absente'));
  const promesse = fetch(`musique/${piste}.bin`)
    .then((r) => {
      if (!r.ok) throw new Error(`Musique introuvable : ${piste}`);
      return r.arrayBuffer();
    })
    .then((chiffre) => dechiffrer(chiffre, CLE))
    .then((mp3) => URL.createObjectURL(new Blob([mp3], { type: 'audio/mpeg' })));
  promesse.catch(() => memoire.delete(piste));
  memoire.set(piste, promesse);
  // On libère les morceaux de niveau les plus anciens (jamais celui du menu).
  const niveaux = [...memoire.keys()].filter((p) => p !== MUSIQUES.menu);
  for (const ancien of niveaux.slice(0, Math.max(0, niveaux.length - GARDES))) {
    void memoire.get(ancien)?.then((url) => URL.revokeObjectURL(url), () => undefined);
    memoire.delete(ancien);
  }
  return promesse;
}

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
  unique ??= new Lecteur(environnementNavigateur(), urlPiste);
  return unique;
}
