// Lecteur de musique du jeu.
// - Une piste « menu » (Nuit Douce) qui joue en continu sur tous les écrans hors jeu : passer
//   de l'accueil au parcours, aux réglages ou aux statistiques ne la fait pas recommencer.
// - Une piste par niveau, qui repart du début à chaque fois qu'on entre dans un niveau.
//   En revenant au menu, Nuit Douce reprend là où elle s'était arrêtée.
// - Les navigateurs interdisent de lancer un son avant une action du joueur : si la lecture est
//   refusée, elle est retentée au premier appui sur l'écran ou au clavier.
// - La musique se met en pause quand le jeu n'est plus visible (autre application, écran éteint).

/** Ce dont le lecteur a besoin d'un élément audio (permet de le tester sans navigateur). */
export interface ElementAudio {
  src: string;
  loop: boolean;
  volume: number;
  currentTime: number;
  paused: boolean;
  preload: string;
  play(): Promise<void>;
  pause(): void;
  dataset?: DOMStringMap;
}

export interface Environnement {
  creerAudio(): ElementAudio;
  /** Appelle `rappel` une seule fois, au prochain geste du joueur. */
  auPremierGeste(rappel: () => void): void;
  /** Appelle `rappel(visible)` à chaque changement de visibilité de la page. */
  surVisibilite(rappel: (visible: boolean) => void): void;
}

export type Cible = { type: 'menu'; piste: string } | { type: 'niveau'; piste: string; cle: string };

/** Vrai si le navigateur laisse régler le volume (ce n'est pas le cas sur iPhone et iPad). */
export function volumeReglable(): boolean {
  try {
    const a = document.createElement('audio');
    a.volume = 0.5;
    return a.volume === 0.5;
  } catch {
    return false;
  }
}

export class Lecteur {
  private readonly menu: ElementAudio;
  private readonly niveau: ElementAudio;
  private cible: Cible | null = null;
  private actif = true;
  private visible = true;
  private enAttenteDeGeste = false;
  private volume = 0.6;
  /** Ce qui est réellement chargé dans chaque élément (la source arrive après déchiffrement). */
  private chargeMenu = '';
  private chargeNiveau = '';
  private demande = 0;

  constructor(
    private readonly env: Environnement,
    /** Adresse lisible d'un morceau (ici : déchiffré en mémoire, d'où une promesse). */
    private readonly chemin: (piste: string) => string | Promise<string>,
  ) {
    this.menu = env.creerAudio();
    this.niveau = env.creerAudio();
    for (const [a, role] of [
      [this.menu, 'menu'],
      [this.niveau, 'niveau'],
    ] as const) {
      a.loop = true;
      a.volume = this.volume;
      a.preload = role === 'menu' ? 'auto' : 'none';
      if (a.dataset) a.dataset.musique = role;
    }
    env.surVisibilite((visible) => {
      this.visible = visible;
      this.appliquer();
    });
  }

  /** Change ce qui doit jouer. Ne fait rien si c'est déjà la même chose (même niveau, ou menu). */
  jouer(cible: Cible): void {
    const avant = this.cible;
    const memeChose =
      avant !== null && avant.type === cible.type && avant.piste === cible.piste && (cible.type === 'menu' || (avant.type === 'niveau' && avant.cle === cible.cle));
    if (memeChose) return;
    this.cible = cible;
    const numero = ++this.demande;
    const element = cible.type === 'menu' ? this.menu : this.niveau;
    const charge = `${cible.piste}|${cible.type === 'niveau' ? cible.cle : ''}`;
    // Le menu reprend là où il était s'il a déjà son morceau ; un niveau repart toujours du début.
    if (cible.type === 'menu' && this.chargeMenu === charge) {
      this.appliquer();
      return;
    }
    if (cible.type === 'menu') this.chargeMenu = '';
    else this.chargeNiveau = '';
    this.appliquer(); // met tout de suite en pause ce qui ne doit plus jouer
    Promise.resolve(this.chemin(cible.piste))
      .then((src) => {
        if (numero !== this.demande) return; // le joueur a déjà changé d'écran
        element.src = src;
        element.currentTime = 0;
        if (element.dataset) element.dataset.piste = cible.piste;
        if (cible.type === 'menu') this.chargeMenu = charge;
        else this.chargeNiveau = charge;
        this.appliquer();
      })
      .catch(() => {
        /* musique indisponible (clé absente, réseau coupé) : le jeu continue sans */
      });
  }

  /** Règle le volume (0 à 1). Sans effet sur iPhone, où le système l'impose. */
  regler(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    this.menu.volume = this.volume;
    this.niveau.volume = this.volume;
  }

  /** Active ou coupe la musique (réglage du joueur). */
  activer(actif: boolean): void {
    this.actif = actif;
    this.appliquer();
  }

  /** Met en lecture l'élément voulu et met l'autre en pause, selon l'état. */
  private appliquer(): void {
    const c = this.cible;
    const pret = c !== null && (c.type === 'menu' ? this.chargeMenu === `${c.piste}|` : this.chargeNiveau === `${c.piste}|${c.cle}`);
    // Tant que le bon morceau n'est pas chargé, rien ne joue (pas même l'ancien morceau).
    const voulu = !pret || c === null ? null : c.type === 'menu' ? this.menu : this.niveau;
    for (const a of [this.menu, this.niveau]) if (a !== voulu && !a.paused) a.pause();
    if (!voulu) return;
    if (!this.actif || !this.visible) {
      if (!voulu.paused) voulu.pause();
      return;
    }
    if (voulu.paused) {
      voulu.play().catch(() => {
        // Lecture refusée (pas encore d'action du joueur) : on réessaiera au premier geste.
        if (this.enAttenteDeGeste) return;
        this.enAttenteDeGeste = true;
        this.env.auPremierGeste(() => {
          this.enAttenteDeGeste = false;
          this.appliquer();
        });
      });
    }
  }
}

/** Environnement réel, dans le navigateur. Les éléments audio sont ajoutés (cachés) à la page. */
export function environnementNavigateur(): Environnement {
  return {
    creerAudio() {
      const a = document.createElement('audio');
      a.hidden = true;
      document.body.appendChild(a);
      return a;
    },
    auPremierGeste(rappel) {
      const une = () => {
        window.removeEventListener('pointerdown', une, true);
        window.removeEventListener('keydown', une, true);
        rappel();
      };
      window.addEventListener('pointerdown', une, true);
      window.addEventListener('keydown', une, true);
    },
    surVisibilite(rappel) {
      document.addEventListener('visibilitychange', () => rappel(document.visibilityState === 'visible'));
    },
  };
}
