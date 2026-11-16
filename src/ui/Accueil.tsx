import { nombreTerminees, totalEtoiles, type Progression } from '../progression/progression';
import { Decor } from './Decor';

interface Props {
  ids: string[];
  progression: Progression;
  partieEnCours: boolean;
  defiReussi: boolean;
  belmont: { faites: number; total: number };
  surUnivers: () => void;
  surJouer: () => void;
  surDefi: () => void;
  surParcours: () => void;
  surStats: () => void;
  surCollection: () => void;
  surReglages: () => void;
}

export function Accueil(p: Props) {
  const faites = nombreTerminees(p.ids, p.progression);
  const dejaJoue = faites > 0 || p.partieEnCours;
  return (
    <div className="ecran accueil">
      <Decor />
      <div className="accueil-haut">
        <h1 className="titre-jeu">
          <span className="petit">Les</span> Mots Fléchés
        </h1>
        <p className="ruban">La nostalgie en mots fléchés</p>
        <img className="portrait" src="serge/portrait.webp" alt="Serge Belmont" width="320" height="320" />
      </div>

      <div className="accueil-bas">
        <div className="compteurs">
          <div className="compteur">
            <strong>
              {faites}/{p.ids.length}
            </strong>
            <span>grilles terminées</span>
          </div>
          <div className="compteur">
            <strong>
              <span className="etoile pleine">★</span> {totalEtoiles(p.progression)}
            </strong>
            <span>étoiles gagnées</span>
          </div>
        </div>
        <button className="bouton-or grand" onClick={p.surJouer}>
          {dejaJoue ? 'Continuer' : 'Jouer'}
        </button>
        <button className={`bouton-sombre defi ${p.defiReussi ? 'reussi' : ''}`} onClick={p.surDefi}>
          {p.defiReussi ? '✓ Défi du jour réussi' : 'Défi du jour'}
        </button>
        {p.belmont.total > 0 && (
          <button className="bouton-sombre univers" onClick={p.surUnivers}>
            <img src="serge/portrait.webp" alt="" />
            <span>
              Univers Serge Belmont
              <small>
                {p.belmont.faites}/{p.belmont.total} grilles
              </small>
            </span>
          </button>
        )}
        <div className="rangee-boutons">
          <button className="bouton-sombre" onClick={p.surParcours}>
            Parcours
          </button>
          <button className="bouton-sombre" onClick={p.surCollection}>
            Collection
          </button>
        </div>
        <div className="rangee-boutons">
          <button className="bouton-sombre" onClick={p.surStats}>
            Statistiques
          </button>
          <button className="bouton-sombre" onClick={p.surReglages}>
            Réglages
          </button>
        </div>
      </div>
    </div>
  );
}
