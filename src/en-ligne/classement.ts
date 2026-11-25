// Classement en ligne (Supabase), anonyme : pas de compte, un pseudo au choix.
//
// L'identité du joueur est PARTAGÉE avec Bubble Nostalgia : les deux jeux sont
// sur le même site (sergebelmont.com), ils lisent donc la même clé du
// navigateur. Un pseudo choisi dans un jeu vaut pour l'autre.
//
// Le serveur vérifie chaque envoi (voir supabase/classement.sql).
import type { Progression } from '../progression/progression';

/** Adresse et clé PUBLIQUE du projet Supabase (faite pour être visible ; jamais la clé secrète). */
const URL_SUPABASE = 'https://xfvyujzzrubpqzrimots.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable_0__DCATjWu45u9UGz6VG4g_ZvEUW_uF';

/** Clé partagée avec Bubble Nostalgia (même forme : id, token, pseudo). */
const CLE_IDENTITE = 'sbbr-player-v1';
/** Ce que ce jeu a déjà envoyé : grille → [étoiles, secondes]. */
const CLE_ENVOIS = 'mots-fleches:classement-envoye';

export interface LigneClassement {
  rank: number;
  pseudo: string;
  stars: number;
  grids: number;
  seconds: number;
  is_me: boolean;
}

interface Identite {
  id: string;
  token: string;
  pseudo: string | null;
}

export class ErreurClassement extends Error {}

const MESSAGES: Record<string, string> = {
  pseudo_pris: 'Ce pseudo est déjà pris, choisissez-en un autre.',
  pseudo_longueur: 'Le pseudo doit faire entre 3 et 16 caractères.',
  pseudo_caracteres: 'Lettres, chiffres, espaces, points, tirets et « _ » uniquement.',
  trop_rapide: 'Un instant… réessayez dans quelques secondes.',
};

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string): void {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible */
  }
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Identité partagée ; créée au premier besoin. Les champs propres à Bubble Nostalgia sont conservés. */
function identite(): Identite {
  let brut: Record<string, unknown> = {};
  try {
    brut = JSON.parse(lire(CLE_IDENTITE) ?? '{}') as Record<string, unknown>;
  } catch {
    brut = {};
  }
  if (typeof brut.id !== 'string' || typeof brut.token !== 'string') {
    brut = { ...brut, id: uuid(), token: `${uuid()}${uuid()}`, pseudo: null, sent: brut.sent ?? {} };
    ecrire(CLE_IDENTITE, JSON.stringify(brut));
  }
  return { id: brut.id as string, token: brut.token as string, pseudo: typeof brut.pseudo === 'string' ? brut.pseudo : null };
}

function memoriserPseudo(pseudo: string): void {
  let brut: Record<string, unknown> = {};
  try {
    brut = JSON.parse(lire(CLE_IDENTITE) ?? '{}') as Record<string, unknown>;
  } catch {
    /* illisible : remplacé */
  }
  ecrire(CLE_IDENTITE, JSON.stringify({ ...brut, pseudo }));
}

export const pseudoDuJoueur = (): string | null => identite().pseudo;

async function appeler<T>(fonction: string, corps: Record<string, unknown>): Promise<T> {
  const controle = new AbortController();
  const minuterie = window.setTimeout(() => controle.abort(), 9000);
  let reponse: Response;
  try {
    reponse = await fetch(`${URL_SUPABASE}/rest/v1/rpc/${fonction}`, {
      method: 'POST',
      headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
      signal: controle.signal,
    });
  } catch {
    throw new ErreurClassement('Classement indisponible : vérifiez votre connexion.');
  } finally {
    window.clearTimeout(minuterie);
  }
  if (!reponse.ok) {
    let code = '';
    try {
      code = ((await reponse.json()) as { message?: string }).message ?? '';
    } catch {
      /* réponse illisible */
    }
    throw new ErreurClassement(MESSAGES[code] ?? 'Le classement n’a pas pu être mis à jour.');
  }
  return (await reponse.json()) as T;
}

export async function choisirPseudo(pseudo: string, progression: Progression): Promise<string> {
  const moi = identite();
  const enregistre = await appeler<string>('set_pseudo', { p_id: moi.id, p_token: moi.token, p_pseudo: pseudo });
  memoriserPseudo(enregistre);
  await synchroniser(progression);
  return enregistre;
}

type Envois = Record<string, [number, number | null]>;

/**
 * Résultats à envoyer, dans l'ordre exigé par le serveur : chaque série
 * (« 001 », « 002 »… puis « B01 », « B02 »…) s'arrête à la première grille non
 * terminée, et seuls les résultats meilleurs que ceux déjà envoyés partent.
 */
export function resultatsAEnvoyer(
  progression: Progression,
  envoyes: Envois,
): Array<{ grille: string; etoiles: number; secondes: number | null }> {
  const sortie: Array<{ grille: string; etoiles: number; secondes: number | null }> = [];
  const series = [
    (n: number) => String(n).padStart(3, '0'),
    (n: number) => `B${String(n).padStart(2, '0')}`,
  ];
  for (const nom of series) {
    for (let n = 1; n < 1000; n++) {
      const grille = nom(n);
      const r = progression.terminees[grille];
      if (!r) break;
      const secondes = typeof r.secondes === 'number' && r.secondes >= 20 && r.secondes <= 86400 ? Math.round(r.secondes) : null;
      const deja = envoyes[grille];
      const mieux =
        !deja ||
        r.etoiles > deja[0] ||
        (secondes !== null && (deja[1] === null || secondes < deja[1]));
      if (mieux) sortie.push({ grille, etoiles: r.etoiles, secondes });
    }
  }
  return sortie;
}

let enCours: Promise<void> | null = null;

/** Envoie les résultats pas encore envoyés. Silencieux : sans réseau, on réessaiera plus tard. */
export function synchroniser(progression: Progression): Promise<void> {
  if (!identite().pseudo) return Promise.resolve();
  enCours ??= (async () => {
    const moi = identite();
    let envoyes: Envois = {};
    try {
      envoyes = JSON.parse(lire(CLE_ENVOIS) ?? '{}') as Envois;
    } catch {
      envoyes = {};
    }
    for (const r of resultatsAEnvoyer(progression, envoyes)) {
      await appeler<number>('mf_submit', {
        p_id: moi.id,
        p_token: moi.token,
        p_grid: r.grille,
        p_stars: r.etoiles,
        p_seconds: r.secondes,
      });
      const avant = envoyes[r.grille];
      envoyes[r.grille] = [
        Math.max(r.etoiles, avant?.[0] ?? 0),
        r.secondes === null ? (avant?.[1] ?? null) : Math.min(r.secondes, avant?.[1] ?? Infinity),
      ];
      ecrire(CLE_ENVOIS, JSON.stringify(envoyes));
    }
  })()
    .catch(() => {
      /* réessai plus tard */
    })
    .finally(() => {
      enCours = null;
    });
  return enCours;
}

export async function chargerClassement(progression: Progression): Promise<{ top: LigneClassement[]; moi: LigneClassement | null }> {
  await synchroniser(progression);
  const moi = identite();
  const [top, mien] = await Promise.all([
    appeler<LigneClassement[]>('mf_leaderboard', { p_limit: 50 }),
    moi.pseudo ? appeler<LigneClassement[]>('mf_player_rank', { p_id: moi.id }) : Promise.resolve([] as LigneClassement[]),
  ]);
  const maLigne = mien[0] ?? null;
  for (const l of top) l.is_me = Boolean(maLigne && l.pseudo === maLigne.pseudo);
  return { top, moi: maLigne };
}
