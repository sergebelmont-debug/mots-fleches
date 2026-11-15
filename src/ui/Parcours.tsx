import type { Grille } from '../engine/grille';
import { estDebloquee, grilleAJouer, totalEtoiles, type Progression } from '../progression/progression';
import { Etoiles } from './Etoiles';

interface Props {
  grilles: Grille[];
  progression: Progression;
  enCours: string[];
  surJouer: (id: string) => void;
  surRetour: () => void;
}

const PAS = 128; // distance verticale entre deux niveaux
const DECALAGES = [0, 62, 0, -62]; // le chemin serpente

export function Parcours({ grilles, progression, enCours, surJouer, surRetour }: Props) {
  const ids = grilles.map((g) => g.id);
  const actuelle = grilleAJouer(ids, progression);
  const points = grilles.map((_, i) => ({ x: 160 + DECALAGES[i % 4], y: 56 + i * PAS }));
  const hauteur = 56 + grilles.length * PAS + 30;

  return (
    <div className="ecran parcours">
      <header className="barre">
        <button className="rond" aria-label="Retour à l'accueil" onClick={surRetour}>
          ←
        </button>
        <span className="barre-titre">Parcours</span>
        <span className="barre-etoiles">
          <span className="etoile pleine">★</span> {totalEtoiles(progression)}
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
            const classes = ['niveau', ouverte ? 'ouvert' : 'ferme', resultat ? 'fait' : '', g.id === actuelle && !resultat ? 'actuel' : ''].join(' ');
            return (
              <div key={g.id} className={classes} style={{ left: `${(points[i].x / 320) * 100}%`, top: points[i].y }}>
                <button
                  className="pastille"
                  disabled={!ouverte}
                  onClick={() => surJouer(g.id)}
                  aria-label={ouverte ? `Jouer le niveau ${i + 1} : ${g.titre}` : `Niveau ${i + 1} verrouillé`}
                  data-niveau={g.id}
                >
                  {ouverte ? i + 1 : '🔒'}
                </button>
                <div className="niveau-texte">
                  {resultat ? <Etoiles nombre={resultat.etoiles} /> : enCours.includes(g.id) ? <em>en cours</em> : null}
                  <span>{g.titre}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="a-venir">D'autres grilles arrivent bientôt.</p>
      </div>
    </div>
  );
}
