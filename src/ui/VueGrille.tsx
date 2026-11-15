import type { CSSProperties } from 'react';
import type { Fleche, Grille } from '../engine/grille';
import type { Partie } from '../engine/partie';

interface Props {
  grille: Grille;
  partie: Partie;
  surCase: (k: number) => void;
  surMot: (id: number) => void;
}

function DessinFleche({ fleche }: { fleche: Fleche }) {
  return (
    <svg className={`fleche fl-${fleche}`} viewBox="0 0 12 12" aria-hidden="true">
      {fleche === 'droite' && <polygon points="2,2 10,6 2,10" />}
      {fleche === 'bas' && <polygon points="2,2 10,2 6,10" />}
      {fleche === 'droite-puis-bas' && (
        <>
          <path d="M1 3 H7 V6" />
          <polygon points="3.5,6 10.5,6 7,11" />
        </>
      )}
      {fleche === 'bas-puis-droite' && (
        <>
          <path d="M3 1 V7 H6" />
          <polygon points="6,3.5 6,10.5 11,7" />
        </>
      )}
    </svg>
  );
}

export function VueGrille({ grille, partie, surCase, surMot }: Props) {
  const actif = new Set(grille.mots[partie.motActif].cases);
  const style = { '--cols': grille.largeur, '--rows': grille.hauteur } as CSSProperties;

  return (
    <div className="grille" style={style}>
      {grille.cases.map((c, k) => {
        if (c.type === 'vide') return <div key={k} className="case vide" />;

        if (c.type === 'definition') {
          // Les flèches qui partent vers la droite en haut, celles qui partent vers le bas en dessous.
          const ordre = [...c.mots].sort(
            (a, b) => Number(grille.mots[a].fleche.startsWith('bas')) - Number(grille.mots[b].fleche.startsWith('bas')),
          );
          return (
            <div key={k} className="case definition">
              {ordre.map((id) => {
                const m = grille.mots[id];
                return (
                  <button
                    key={id}
                    className={`def ${id === partie.motActif ? 'active' : ''} vers-${m.fleche.startsWith('bas') ? 'bas' : 'droite'}`}
                    onClick={() => surMot(id)}
                    data-mot={id}
                  >
                    <span lang="fr">{m.definition}</span>
                    <DessinFleche fleche={m.fleche} />
                  </button>
                );
              })}
            </div>
          );
        }

        const classes = [
          'case',
          'lettre',
          actif.has(k) ? 'dans-mot' : '',
          k === partie.caseActive ? 'curseur' : '',
          partie.fausses[k] ? 'fausse' : '',
          partie.verrouillees[k] ? 'revelee' : '',
        ].join(' ');
        return (
          <button key={k} className={classes} onClick={() => surCase(k)} data-case={k} aria-label={`Case ${k}`}>
            {partie.saisie[k]}
          </button>
        );
      })}
    </div>
  );
}
