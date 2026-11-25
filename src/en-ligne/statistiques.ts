// MESURE D'AUDIENCE ANONYME (Les Mots Fléchés)
//
// Même principe que Bubble Nostalgia, et mêmes clés du navigateur : un seul
// identifiant anonyme et un seul choix de refus pour les deux jeux du site.
//  • identifiant tiré au hasard, aucun nom, aucune adresse IP enregistrée ;
//  • uniquement l'usage du jeu (grilles commencées, terminées, abandonnées,
//    durée, indices, écrans ouverts), la provenance et le type d'appareil ;
//  • refus possible à tout moment (Réglages → Statistiques anonymes) ;
//  • effacement automatique après 13 mois (côté serveur).
// Envoi groupé toutes les 20 secondes et quand le joueur quitte la page.

const URL_SUPABASE = 'https://xfvyujzzrubpqzrimots.supabase.co';
const CLE_PUBLIQUE = 'sb_publishable_0__DCATjWu45u9UGz6VG4g_ZvEUW_uF';
const CLE_VISITEUR = 'sbbr-visitor-v1'; // partagée avec Bubble Nostalgia
const CLE_REFUS = 'sbbr-analytics-optout'; // partagée avec Bubble Nostalgia
const PERIODE = 20000;

type Type = 'open' | 'time' | 'level_start' | 'level_end' | 'collection' | 'board' | 'pseudo' | 'optout' | 'stats' | 'univers';

interface Evenement {
  type: Type;
  game: 'mf';
  level?: number;
  seconds?: number;
  hints?: number;
  result?: 'won' | 'quit';
  lang?: string;
  src?: string;
  device?: string;
}

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string | null): void {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
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

/** Provenance : ?src=… dans le lien, sinon le site d'où vient le visiteur. */
export function provenance(recherche: string, referent: string, hote: string): string {
  const param = new URLSearchParams(recherche).get('src');
  if (param) return param.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) || 'direct';
  let site = '';
  try {
    site = referent ? new URL(referent).hostname.replace(/^www\./, '') : '';
  } catch {
    /* référent illisible */
  }
  if (!site) return 'direct';
  if (site === hote) return 'site';
  const connus: Array<[RegExp, string]> = [
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$|messenger\.com$/, 'facebook'],
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)youtube\.com$|youtu\.be$/, 'youtube'],
    [/(^|\.)google\./, 'google'],
    [/(^|\.)whatsapp\./, 'whatsapp'],
    [/(^|\.)submithub\.com$/, 'submithub'],
    [/(^|\.)spotify\.com$/, 'spotify'],
    [/(^|\.)(twitter|x)\.com$|^t\.co$/, 'x'],
    [/sergebelmont\.com$/, 'site'],
  ];
  for (const [re, nom] of connus) if (re.test(site)) return nom;
  return 'autre';
}

function appareil(): 'mobile' | 'tablet' | 'desktop' {
  const tactile = navigator.maxTouchPoints > 0;
  const petit = Math.min(screen.width, screen.height);
  if (tactile && petit < 600) return 'mobile';
  if (tactile) return 'tablet';
  return 'desktop';
}

class Statistiques {
  private file: Evenement[] = [];
  private visiteur = '';
  private readonly session = uuid();
  private minuterie = 0;
  private actifDepuis = 0;
  private actifMs = 0;
  private demarre = false;
  private grille: { niveau: number; depuis: number } | null = null;

  get refusees(): boolean {
    return lire(CLE_REFUS) === '1';
  }

  demarrer(): void {
    if (this.demarre || this.refusees || typeof window === 'undefined') return;
    // Uniquement sur le vrai site : les essais en local et les tests automatiques ne comptent pas.
    if (!/(^|\.)sergebelmont\.com$/.test(location.hostname)) return;
    this.demarre = true;
    this.visiteur = lire(CLE_VISITEUR) ?? '';
    if (!this.visiteur) {
      this.visiteur = uuid();
      ecrire(CLE_VISITEUR, this.visiteur);
    }
    this.pousser({ type: 'open', game: 'mf', lang: 'fr', src: provenance(location.search, document.referrer, location.hostname), device: appareil() });
    this.actifDepuis = document.hidden ? 0 : performance.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.arreterChrono();
        this.envoyer(true);
      } else if (!this.actifDepuis) {
        this.actifDepuis = performance.now();
      }
    });
    window.addEventListener('pagehide', () => {
      this.finGrille('quit');
      this.arreterChrono();
      this.envoyer(true);
    });
    this.minuterie = window.setInterval(() => {
      this.arreterChrono();
      if (!document.hidden) this.actifDepuis = performance.now();
      this.envoyer(false);
    }, PERIODE);
  }

  /** Le joueur refuse (ou accepte de nouveau) les statistiques. */
  refuser(refus: boolean): void {
    if (refus) {
      if (this.demarre && this.visiteur) {
        this.pousser({ type: 'optout', game: 'mf' });
        this.envoyer(true);
      }
      ecrire(CLE_REFUS, '1');
      ecrire(CLE_VISITEUR, null); // l'identifiant est supprimé de l'appareil
      this.file = [];
      this.grille = null;
      window.clearInterval(this.minuterie);
      this.demarre = false;
    } else {
      ecrire(CLE_REFUS, null);
      this.demarrer();
    }
  }

  noter(type: Type, extra: Omit<Evenement, 'type' | 'game'> = {}): void {
    if (!this.demarre || !this.visiteur || this.refusees) return;
    this.pousser({ type, game: 'mf', ...extra });
  }

  /** Niveau : 1 à 99 = parcours, 100 + n = univers Serge Belmont, 0 = défi du jour. */
  debutGrille(niveau: number): void {
    this.finGrille('quit');
    this.grille = { niveau, depuis: performance.now() };
    this.noter('level_start', { level: niveau });
  }

  finGrille(resultat: 'won' | 'quit', indices?: number, secondes?: number): void {
    if (!this.grille) return;
    const duree = secondes ?? Math.round((performance.now() - this.grille.depuis) / 1000);
    this.noter('level_end', { level: this.grille.niveau, result: resultat, seconds: Math.round(duree), hints: indices });
    this.grille = null;
  }

  private arreterChrono(): void {
    if (!this.actifDepuis) return;
    this.actifMs += performance.now() - this.actifDepuis;
    this.actifDepuis = 0;
  }

  private pousser(e: Evenement): void {
    this.file.push(e);
    if (this.file.length >= 40) this.envoyer(false);
  }

  private envoyer(enPartant: boolean): void {
    if (!this.visiteur || this.refusees) return;
    const secondes = Math.round(this.actifMs / 1000);
    if (secondes > 0) {
      this.file.push({ type: 'time', game: 'mf', seconds: secondes });
      this.actifMs = 0;
    }
    if (!this.file.length) return;
    const lot = this.file.splice(0, 50);
    try {
      void fetch(`${URL_SUPABASE}/rest/v1/rpc/log_events`, {
        method: 'POST',
        headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_visitor: this.visiteur, p_session: this.session, p_events: lot }),
        keepalive: enPartant,
      }).catch(() => {
        /* hors ligne : ces mesures sont perdues, sans gêner le jeu */
      });
    } catch {
      /* ignoré */
    }
  }
}

export const statistiques = new Statistiques();
