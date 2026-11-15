const RANGEES = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];

interface Props {
  surLettre: (l: string) => void;
  surEffacer: () => void;
}

/** Clavier AZERTY intégré : 26 lettres + effacer. Pas de clavier système, donc la grille n'est jamais masquée. */
export function Clavier({ surLettre, surEffacer }: Props) {
  return (
    <div className="clavier">
      {RANGEES.map((r, i) => (
        <div key={r} className="rangee">
          {[...r].map((l) => (
            <button key={l} className="touche" onClick={() => surLettre(l)}>
              {l}
            </button>
          ))}
          {i === 2 && (
            <button className="touche large" aria-label="Effacer la lettre" onClick={surEffacer}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
