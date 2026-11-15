import { useEffect, useRef, useState } from 'react';
import type { Grille } from '../engine/grille';
import {
  creerPartie,
  effacer,
  effacerMot,
  estTerminee,
  indice,
  motVoisin,
  motsJustes,
  nombreFausses,
  saisirLettre,
  selectionnerCase,
  selectionnerMot,
  verifier,
  type Partie,
} from '../engine/partie';
import { etoilesPour } from '../progression/progression';
import { Clavier } from './Clavier';
import { Etoiles } from './Etoiles';
import { VueGrille } from './VueGrille';

interface Props {
  grille: Grille;
  numero: number;
  partieInitiale: Partie | null;
  signalerMotsJustes: boolean;
  enPause: boolean;
  aSuivante: boolean;
  surPartie: (p: Partie) => void;
  surTerminee: (indices: number) => void;
  surRetour: () => void;
  surSuivante: () => void;
  surMenu: () => void;
}

export function Jeu(props: Props) {
  const { grille, numero, signalerMotsJustes, enPause } = props;
  const [partie, setPartie] = useState<Partie>(() => props.partieInitiale ?? creerPartie(grille));
  const [message, setMessage] = useState('');
  const [eclat, setEclat] = useState<ReadonlySet<number>>(new Set());
  const justesAvant = useRef<number[]>(motsJustes(grille, partie));
  const finSignalee = useRef(false);
  const terminee = estTerminee(grille, partie);

  const agir = (f: (p: Partie) => Partie) => {
    setMessage('');
    setPartie(f);
  };

  // À chaque changement : sauvegarde, illumination des mots devenus justes, fin de grille.
  useEffect(() => {
    const justes = motsJustes(grille, partie);
    const nouveaux = justes.filter((id) => !justesAvant.current.includes(id));
    justesAvant.current = justes;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    if (nouveaux.length > 0 && signalerMotsJustes) {
      setEclat(new Set(nouveaux.flatMap((id) => grille.mots[id].cases)));
      minuterie = setTimeout(() => setEclat(new Set()), 900);
    }
    if (estTerminee(grille, partie)) {
      if (!finSignalee.current) {
        finSignalee.current = true;
        props.surTerminee(partie.indices);
      }
    } else {
      finSignalee.current = false;
      props.surPartie(partie);
    }
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partie]);

  // Clavier physique (ordinateur).
  useEffect(() => {
    if (enPause || terminee) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) agir((p) => saisirLettre(grille, p, e.key));
      else if (e.key === 'Backspace') agir((p) => effacer(grille, p));
      else if (e.key === 'Tab') {
        e.preventDefault();
        agir((p) => motVoisin(grille, p, e.shiftKey ? -1 : 1));
      }
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [grille, enPause, terminee]);

  const mot = grille.mots[partie.motActif];

  const surVerifier = () => {
    const p = verifier(grille, partie);
    const n = nombreFausses(p);
    setPartie(p);
    setMessage(n === 0 ? 'Aucune erreur pour l’instant.' : n === 1 ? '1 lettre à corriger.' : `${n} lettres à corriger.`);
  };

  return (
    <div className="ecran jeu">
      <header className="barre">
        <button className="rond" aria-label="Retour au parcours" onClick={props.surRetour}>
          ←
        </button>
        <span className="barre-titre">
          Niveau {numero}
          <small>{grille.titre}</small>
        </span>
        <Etoiles nombre={etoilesPour(partie.indices)} />
      </header>

      <main className="zone-grille">
        <VueGrille
          grille={grille}
          partie={partie}
          eclat={eclat}
          surCase={(k) => agir((p) => selectionnerCase(grille, p, k))}
          surMot={(id) => agir((p) => selectionnerMot(grille, p, id))}
        />
      </main>

      <section className="barre-definition" aria-live="polite">
        <button className="nav" aria-label="Mot précédent" onClick={() => agir((p) => motVoisin(grille, p, -1))}>
          ‹
        </button>
        <div className="definition-active">
          <span className="texte">{message || mot.definition}</span>
          {!message && (
            <span className="longueur">
              {mot.sens === 'H' ? 'Horizontal' : 'Vertical'} · {mot.cases.length} lettres
            </span>
          )}
        </div>
        <button className="nav" aria-label="Mot suivant" onClick={() => agir((p) => motVoisin(grille, p, 1))}>
          ›
        </button>
      </section>

      <section className="actions">
        <button className="bouton-or" onClick={() => agir((p) => indice(grille, p))}>
          Indice
        </button>
        <button className="bouton-sombre" onClick={() => agir((p) => effacerMot(grille, p))}>
          Effacer
        </button>
        <button className="bouton-or" onClick={surVerifier}>
          Vérifier
        </button>
        <button className="bouton-sombre" onClick={props.surMenu}>
          Menu
        </button>
      </section>

      <Clavier surLettre={(l) => agir((p) => saisirLettre(grille, p, l))} surEffacer={() => agir((p) => effacer(grille, p))} />

      {terminee && (
        <div className="voile victoire" role="dialog" aria-label="Grille terminée">
          <div className="carte">
            <div className="rayons" aria-hidden="true" />
            <h2>Bravo !</h2>
            <Etoiles nombre={etoilesPour(partie.indices)} anime />
            <p>Niveau {numero} terminé</p>
            <p className="detail">{partie.indices === 0 ? 'Sans aucun indice.' : `Indices utilisés : ${partie.indices}`}</p>
            {props.aSuivante && (
              <button className="bouton-or grand" onClick={props.surSuivante}>
                Grille suivante
              </button>
            )}
            <div className="rangee-boutons">
              <button className="bouton-sombre" onClick={props.surRetour}>
                Parcours
              </button>
              <button className="bouton-sombre" onClick={() => agir(() => creerPartie(grille))}>
                Rejouer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
