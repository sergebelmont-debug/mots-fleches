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

  constructor(
    private readonly env: Environnement,
    private readonly chemin: (piste: string) => string,
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
    if (cible.type === 'menu') {
      const src = this.chemin(cible.piste);
      if (!this.menu.src.endsWith(src)) {
        this.menu.src = src;
        this.menu.currentTime = 0;
      }
    } else {
      // Un niveau repart toujours du début, même si c'est le même morceau que le niveau précédent.
      this.niveau.src = this.chemin(cible.piste);
      this.niveau.currentTime = 0;
    }
    this.appliquer();
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
    const voulu = this.cible === null ? null : this.cible.type === 'menu' ? this.menu : this.niveau;
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
