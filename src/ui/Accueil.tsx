import { nombreTerminees, totalEtoiles, type Progression } from '../progression/progression';
import { Decor } from './Decor';

interface Props {
  ids: string[];
  progression: Progression;
  partieEnCours: boolean;
  surJouer: () => void;
  surParcours: () => void;
  surReglages: () => void;
}

export function Accueil({ ids, progression, partieEnCours, surJouer, surParcours, surReglages }: Props) {
  const faites = nombreTerminees(ids, progression);
  const dejaJoue = faites > 0 || partieEnCours;
  return (
    <div className="ecran accueil">
      <Decor />
      <div className="accueil-haut">
        <h1 className="titre-jeu">
          <span className="petit">Les</span> Mots Fléchés
        </h1>
        <p className="ruban">La nostalgie en mots fléchés</p>
      </div>

      <div className="accueil-bas">
        <div className="compteurs">
          <div className="compteur">
            <strong>
              {faites}/{ids.length}
            </strong>
            <span>grilles terminées</span>
          </div>
          <div className="compteur">
            <strong>
              <span className="etoile pleine">★</span> {totalEtoiles(progression)}
            </strong>
            <span>étoiles gagnées</span>
          </div>
        </div>
        <button className="bouton-or grand" onClick={surJouer}>
          {dejaJoue ? 'Continuer' : 'Jouer'}
        </button>
        <div className="rangee-boutons">
          <button className="bouton-sombre" onClick={surParcours}>
            Parcours
          </button>
          <button className="bouton-sombre" onClick={surReglages}>
            Réglages
          </button>
        </div>
      </div>
    </div>
  );
}
