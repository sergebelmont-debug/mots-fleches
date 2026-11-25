import { useEffect, useState, type FormEvent } from 'react';
import { chargerClassement, choisirPseudo, ErreurClassement, pseudoDuJoueur, type LigneClassement } from '../en-ligne/classement';
import { statistiques } from '../en-ligne/statistiques';
import type { Progression } from '../progression/progression';
import { formaterDuree } from '../progression/statistiques';

interface Props {
  progression: Progression;
  surRetour: () => void;
}

const nombre = (n: number) => Number(n).toLocaleString('fr-FR');

function Ligne({ l }: { l: LigneClassement }) {
  return (
    <li className={`ligne-classement${l.is_me ? ' moi' : ''}${l.rank <= 3 ? ` podium-${l.rank}` : ''}`}>
      <span className="rang">{l.rank}</span>
      <span className="nom">{l.pseudo}</span>
      <span className="detail">
        {l.grids} grille{l.grids > 1 ? 's' : ''} · {formaterDuree(Number(l.seconds))}
      </span>
      <span className="score">
        <span className="etoile pleine">★</span> {nombre(l.stars)}
      </span>
    </li>
  );
}

export function Classement({ progression, surRetour }: Props) {
  const [pseudo, setPseudo] = useState<string | null>(pseudoDuJoueur);
  const [modifier, setModifier] = useState(false);
  const [saisie, setSaisie] = useState(pseudo ?? '');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<{ chargement: boolean; erreur: string; top: LigneClassement[]; moi: LigneClassement | null }>({
    chargement: true,
    erreur: '',
    top: [],
    moi: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let actif = true;
    setEtat((e) => ({ ...e, chargement: true, erreur: '' }));
    chargerClassement(progression).then(
      ({ top, moi }) => actif && setEtat({ chargement: false, erreur: '', top, moi }),
      (e: unknown) =>
        actif &&
        setEtat((s) => ({ ...s, chargement: false, erreur: e instanceof ErreurClassement ? e.message : 'Classement indisponible.' })),
    );
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const valider = (e: FormEvent) => {
    e.preventDefault();
    const valeur = saisie.trim();
    if (valeur.length < 3 || valeur.length > 16) {
      setMessage('Le pseudo doit faire entre 3 et 16 caractères.');
      return;
    }
    setEnvoi(true);
    setMessage('Enregistrement…');
    choisirPseudo(valeur, progression).then(
      (enregistre) => {
        setEnvoi(false);
        setMessage('');
        setPseudo(enregistre);
        statistiques.noter('pseudo');
        setModifier(false);
        setVersion((v) => v + 1);
      },
      (err: unknown) => {
        setEnvoi(false);
        setMessage(err instanceof ErreurClassement ? err.message : 'Le pseudo n’a pas pu être enregistré.');
      },
    );
  };

  const moiVisible = etat.moi && etat.top.some((l) => l.is_me);

  return (
    <div className="ecran page">
      <header className="barre">
        <button className="rond" aria-label="Retour à l'accueil" onClick={surRetour}>
          ←
        </button>
        <span className="barre-titre">Classement</span>
      </header>
      <div className="page-contenu">
        {!pseudo || modifier ? (
          <form className="carte-pseudo" onSubmit={valider} autoComplete="off">
            <label htmlFor="pseudo">Choisissez un pseudo pour apparaître au classement (pas de compte à créer)</label>
            <div className="rangee-pseudo">
              <input
                id="pseudo"
                type="text"
                maxLength={16}
                placeholder="Votre pseudo"
                enterKeyHint="done"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
              />
              <button className="bouton-or" type="submit" disabled={envoi}>
                Valider
              </button>
            </div>
            <p className="message-pseudo" aria-live="polite">
              {message}
            </p>
            <p className="aide-pseudo">Le même pseudo sert aussi au classement de Bubble Nostalgia.</p>
          </form>
        ) : (
          <div className="carte-pseudo moi">
            <div>
              <strong>{pseudo}</strong>
              <span>
                {etat.moi
                  ? `${etat.moi.rank}ᵉ · ★ ${nombre(etat.moi.stars)}`
                  : 'Terminez la grille 1 du parcours pour entrer au classement.'}
              </span>
            </div>
            <button
              className="lien"
              onClick={() => {
                setSaisie(pseudo);
                setModifier(true);
              }}
            >
              Modifier
            </button>
          </div>
        )}

        <p className="a-venir" aria-live="polite">
          {etat.chargement
            ? 'Chargement du classement…'
            : etat.erreur || (etat.top.length ? '' : 'Personne au classement pour l’instant. Soyez le premier !')}
        </p>
        <ol className="liste-classement">
          {etat.top.map((l) => (
            <Ligne key={`${l.rank}-${l.pseudo}`} l={l} />
          ))}
          {etat.moi && !moiVisible && (
            <>
              <li className="ellipse">…</li>
              <Ligne l={{ ...etat.moi, is_me: true }} />
            </>
          )}
        </ol>
        <p className="a-venir">Classement : étoiles gagnées, puis grilles terminées, puis temps total le plus court.</p>
      </div>
    </div>
  );
}
