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
import { formaterChrono, formaterDuree } from '../progression/statistiques';
import { Clavier } from './Clavier';
import { Etoiles } from './Etoiles';
import { VueGrille } from './VueGrille';

interface Props {
  grille: Grille;
  etiquette: string; // « Niveau 3 » ou « Défi du jour »
  partieInitiale: Partie | null;
  signalerMotsJustes: boolean;
  agrandir: boolean;
  enPause: boolean;
  aSuivante: boolean;
  nouvellesRecompenses: string[];
  surPartie: (p: Partie) => void;
  surTerminee: (indices: number, secondes: number) => void;
  surRetour: () => void;
  surSuivante: () => void;
  surMenu: () => void;
}

export function Jeu(props: Props) {
  const { grille, etiquette, signalerMotsJustes, enPause } = props;
  const [partie, setPartie] = useState<Partie>(() => props.partieInitiale ?? creerPartie(grille));
  const [secondes, setSecondes] = useState(partie.secondes);
  const [message, setMessage] = useState('');
  const [eclat, setEclat] = useState<ReadonlySet<number>>(new Set());
  const justesAvant = useRef<number[]>(motsJustes(grille, partie));
  const finSignalee = useRef(false);
  const temps = useRef(partie.secondes);
  const terminee = estTerminee(grille, partie);

  const actuelle = useRef(partie);
  const appliquer = (suivante: Partie) => {
    actuelle.current = suivante;
    setPartie(suivante);
    // Sauvegarde ou fin de grille signalées tout de suite, pas au prochain affichage.
    if (estTerminee(grille, suivante)) {
      if (!finSignalee.current) {
        finSignalee.current = true;
        props.surTerminee(suivante.indices, temps.current);
      }
    } else {
      finSignalee.current = false;
      props.surPartie({ ...suivante, secondes: temps.current });
    }
  };
  const agir = (f: (p: Partie) => Partie) => {
    setMessage('');
    appliquer(f(actuelle.current));
  };

  // À chaque changement : illumination des mots devenus justes.
  useEffect(() => {
    const justes = motsJustes(grille, partie);
    const nouveaux = justes.filter((id) => !justesAvant.current.includes(id));
    justesAvant.current = justes;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    if (nouveaux.length > 0 && signalerMotsJustes) {
      setEclat(new Set(nouveaux.flatMap((id) => grille.mots[id].cases)));
      minuterie = setTimeout(() => setEclat(new Set()), 900);
    }
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partie]);

  // Chronomètre : il ne tourne que si la grille est à l'écran et en cours.
  useEffect(() => {
    if (enPause || terminee) return;
    const tic = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      temps.current += 1;
      setSecondes(temps.current);
    }, 1000);
    return () => clearInterval(tic);
  }, [enPause, terminee]);

  // Le temps est sauvegardé toutes les 10 secondes, même sans frappe.
  useEffect(() => {
    if (!terminee && secondes > 0 && secondes % 10 === 0) props.surPartie({ ...actuelle.current, secondes });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondes]);

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
  const etoiles = etoilesPour(partie.indices);

  const surVerifier = () => {
    const p = verifier(grille, actuelle.current);
    const n = nombreFausses(p);
    appliquer(p);
    setMessage(n === 0 ? 'Aucune erreur pour l’instant.' : n === 1 ? '1 lettre à corriger.' : `${n} lettres à corriger.`);
  };

  const recommencer = () => {
    temps.current = 0;
    setSecondes(0);
    setPartage('');
    agir(() => creerPartie(grille));
  };

  // Partage du résultat : menu de partage du téléphone (Facebook, Messenger…), sinon copie du texte.
  const [partage, setPartage] = useState('');
  const partager = async () => {
    const enLigne = !['localhost', '127.0.0.1'].includes(location.hostname);
    const texte = `J'ai terminé « ${grille.titre} » (${etiquette}) des Mots Fléchés en ${formaterDuree(temps.current)} : ${'★'.repeat(etoiles)}${'☆'.repeat(3 - etoiles)}`;
    try {
      if (navigator.share) {
        await navigator.share(enLigne ? { text: texte, url: location.origin + location.pathname } : { text: texte });
        setPartage('Résultat partagé.');
      } else {
        await navigator.clipboard.writeText(enLigne ? `${texte} ${location.origin + location.pathname}` : texte);
        setPartage('Résultat copié : collez-le dans Facebook.');
      }
    } catch (e) {
      // Le joueur a fermé le menu de partage : ce n'est pas une erreur.
      // Sinon, on affiche le texte pour qu'il puisse être copié à la main.
      setPartage((e as Error).name === 'AbortError' ? '' : `À copier : ${texte}`);
    }
  };

  return (
    <div className="ecran jeu">
      <header className="barre">
        <button className="rond" aria-label="Retour" onClick={props.surRetour}>
          ←
        </button>
        <span className="barre-titre">
          {etiquette}
          <small>{grille.titre}</small>
        </span>
        <span className="chrono" aria-label="Temps écoulé">
          {formaterChrono(secondes)}
        </span>
        <Etoiles nombre={etoiles} />
      </header>

      <main className={`zone-grille ${props.agrandir ? 'agrandie' : ''}`}>
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
            <Etoiles nombre={etoiles} anime />
            <p>
              {etiquette} terminé en {formaterDuree(secondes)}
            </p>
            <p className="detail">{partie.indices === 0 ? 'Sans aucun indice.' : `Indices utilisés : ${partie.indices}`}</p>
            {props.nouvellesRecompenses.length > 0 && (
              <p className="medaille-gagnee">
                🏅 {props.nouvellesRecompenses.length > 1 ? 'Nouvelles récompenses' : 'Nouvelle récompense'} :{' '}
                <strong>{props.nouvellesRecompenses.join(', ')}</strong>
              </p>
            )}
            {props.aSuivante && (
              <button className="bouton-or grand" onClick={props.surSuivante}>
                Grille suivante
              </button>
            )}
            <button className="bouton-or" onClick={partager}>
              Partager mon résultat
            </button>
            {partage && <p className="detail copiable">{partage}</p>}
            <div className="rangee-boutons">
              <button className="bouton-sombre" onClick={props.surRetour}>
                Retour
              </button>
              <button className="bouton-sombre" onClick={recommencer}>
                Rejouer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
