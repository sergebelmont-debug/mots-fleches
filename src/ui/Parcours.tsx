import type { Grille } from '../engine/grille';
import { estDebloquee, grilleAJouer, type Progression } from '../progression/progression';
import { Etoiles } from './Etoiles';

interface Props {
  titre: string;
  note: string;
  grilles: Grille[];
  progression: Progression;
  enCours: string[];
  /** Pochette affichée dans la pastille de chaque niveau (univers Serge Belmont). */
  images?: Record<string, string>;
  surJouer: (id: string) => void;
  surRetour: () => void;
}

const PAS = 128; // distance verticale entre deux niveaux
const DECALAGES = [0, 62, 0, -62]; // le chemin serpente

export function Parcours({ titre, note, grilles, progression, enCours, images, surJouer, surRetour }: Props) {
  const ids = grilles.map((g) => g.id);
  const actuelle = grilleAJouer(ids, progression);
  const points = grilles.map((_, i) => ({ x: 160 + DECALAGES[i % 4], y: 56 + i * PAS }));
  const hauteur = 56 + grilles.length * PAS + 30;
  const etoiles = ids.reduce((n, id) => n + (progression.terminees[id]?.etoiles ?? 0), 0);

  return (
    <div className="ecran parcours">
      <header className="barre">
        <button className="rond" aria-label="Retour à l'accueil" onClick={surRetour}>
          ←
        </button>
        <span className="barre-titre">{titre}</span>
        <span className="barre-etoiles">
          <span className="etoile pleine">★</span> {etoiles}
        </span>
      </header>

      <div className="chemin-zone">
        <div className="chemin" style={{ height: hauteur }}>
          <svg className="chemin-trait" viewBox={`0 0 320 ${hauteur}`} aria-hidden="true">
            <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
          </svg>
          {grilles.map((g, i) => {
            const ouverte = estDebloquee(ids, progression, g.id);
            const resultat = progression.terminees[g.id];
            const image = images?.[g.id];
            const classes = [
              'niveau',
              ouverte ? 'ouvert' : 'ferme',
              resultat ? 'fait' : '',
              g.id === actuelle && !resultat ? 'actuel' : '',
              image ? 'illustre' : '',
            ].join(' ');
            return (
              <div key={g.id} className={classes} style={{ left: `${(points[i].x / 320) * 100}%`, top: points[i].y }}>
                <button
                  className="pastille"
                  disabled={!ouverte}
                  onClick={() => surJouer(g.id)}
                  aria-label={ouverte ? `Jouer le niveau ${i + 1} : ${g.titre}` : `Niveau ${i + 1} verrouillé`}
                  data-niveau={g.id}
                >
                  {image && <img src={image} alt="" loading="lazy" />}
                  <span>{ouverte ? i + 1 : '🔒'}</span>
                </button>
                <div className="niveau-texte">
                  {resultat ? <Etoiles nombre={resultat.etoiles} /> : enCours.includes(g.id) ? <em>en cours</em> : null}
                  <span>{g.titre}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="a-venir">{note}</p>
      </div>
    </div>
  );
}
