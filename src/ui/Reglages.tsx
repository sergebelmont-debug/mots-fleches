import { useState } from 'react';
import { statistiques } from '../en-ligne/statistiques';
import { volumeReglable } from '../musique/lecteur';
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
  const [avecVolume] = useState(volumeReglable);
  return (
    <div className="voile" role="dialog" aria-label="Réglages" onClick={surFermer}>
      <div className="carte reglages" onClick={(e) => e.stopPropagation()}>
        <h2>Réglages</h2>

        <div className="reglage colonne musique">
          <label className="ligne-musique">
            <strong>Musique</strong>
            <input type="checkbox" checked={reglages.musique} onChange={(e) => surChange({ ...reglages, musique: e.target.checked })} />
            <i className="interrupteur" aria-hidden="true" />
          </label>
          {avecVolume && (
            <label className="ligne-volume">
              <span aria-hidden="true">🔈</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                aria-label="Volume de la musique"
                disabled={!reglages.musique}
                value={Math.round(reglages.volume * 100)}
                onChange={(e) => surChange({ ...reglages, volume: Number(e.target.value) / 100 })}
              />
              <span aria-hidden="true">🔊</span>
            </label>
          )}
        </div>

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
