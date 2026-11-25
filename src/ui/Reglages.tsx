import { useState } from 'react';
import { statistiques } from '../en-ligne/statistiques';
import type { Reglages as TypeReglages } from '../storage/sauvegarde';

interface Props {
  reglages: TypeReglages;
  surChange: (r: TypeReglages) => void;
  surReinitialiser: () => void;
  surFermer: () => void;
}

export function Reglages({ reglages, surChange, surReinitialiser, surFermer }: Props) {
  const [confirmer, setConfirmer] = useState(false);
  const [mesure, setMesure] = useState(() => !statistiques.refusees);
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

        <label className="reglage">
          <span>
            <strong>Agrandir les grilles</strong>
            <small>Cases plus grandes et définitions plus lisibles, mais la grille défile.</small>
          </span>
          <input type="checkbox" checked={reglages.agrandirGrilles} onChange={(e) => surChange({ ...reglages, agrandirGrilles: e.target.checked })} />
          <i className="interrupteur" aria-hidden="true" />
        </label>

        <label className="reglage">
          <span>
            <strong>Statistiques anonymes</strong>
            <small>Aident à améliorer le jeu (grilles jouées, durée). Aucun nom, aucune publicité.</small>
          </span>
          <input
            type="checkbox"
            checked={mesure}
            onChange={(e) => {
              setMesure(e.target.checked);
              statistiques.refuser(!e.target.checked);
            }}
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

        <p className="liens-legaux">
          <a href="https://sergebelmont.com/mentions-legales/" target="_blank" rel="noopener">
            Mentions légales
          </a>
          {' · '}
          <a href="https://sergebelmont.com/confidentialite/" target="_blank" rel="noopener">
            Confidentialité
          </a>
        </p>

        <button className="bouton-or" onClick={surFermer}>
          Fermer
        </button>
      </div>
    </div>
  );
}
