import { useState } from 'react';
import type { Reglages as TypeReglages } from '../storage/sauvegarde';

interface Props {
  reglages: TypeReglages;
  surChange: (r: TypeReglages) => void;
  surReinitialiser: () => void;
  surFermer: () => void;
}

export function Reglages({ reglages, surChange, surReinitialiser, surFermer }: Props) {
  const [confirmer, setConfirmer] = useState(false);
  return (
    <div className="voile" role="dialog" aria-label="Réglages" onClick={surFermer}>
      <div className="carte reglages" onClick={(e) => e.stopPropagation()}>
        <h2>Réglages</h2>

        <label className="reglage">
          <span>
            <strong>Signaler les mots justes</strong>
            <small>Un mot entièrement correct s'illumine dès qu'il est complet.</small>
          </span>
          <input
            type="checkbox"
            checked={reglages.signalerMotsJustes}
            onChange={(e) => surChange({ ...reglages, signalerMotsJustes: e.target.checked })}
          />
          <i className="interrupteur" aria-hidden="true" />
        </label>

        <div className="reglage colonne">
          <span>
            <strong>Effacer ma progression</strong>
            <small>Grilles terminées, étoiles et parties en cours. Cette action est définitive.</small>
          </span>
          {confirmer ? (
            <div className="rangee-boutons">
              <button className="bouton-danger" onClick={surReinitialiser}>
                Oui, tout effacer
              </button>
              <button className="bouton-sombre" onClick={() => setConfirmer(false)}>
                Annuler
              </button>
            </div>
          ) : (
            <button className="bouton-sombre" onClick={() => setConfirmer(true)}>
              Effacer…
            </button>
          )}
        </div>

        <button className="bouton-or" onClick={surFermer}>
          Fermer
        </button>
      </div>
    </div>
  );
}
