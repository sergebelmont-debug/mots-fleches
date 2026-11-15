import { useEffect, useMemo, useState } from 'react';
import donnees from '../../grilles/001.json';
import { construireGrille, type DonneesGrille } from '../engine/grille';
import {
  creerPartie,
  effacer,
  effacerMot,
  estTerminee,
  indice,
  motVoisin,
  nombreFausses,
  saisirLettre,
  selectionnerCase,
  selectionnerMot,
  verifier,
  type Partie,
} from '../engine/partie';
import { VueGrille } from './VueGrille';
import { Clavier } from './Clavier';

export function App() {
  const { grille, erreurs } = useMemo(() => construireGrille(donnees as DonneesGrille), []);
  const [partie, setPartie] = useState<Partie>(() => creerPartie(grille));
  const [message, setMessage] = useState('');
  const terminee = estTerminee(grille, partie);

  const agir = (f: (p: Partie) => Partie) => {
    setMessage('');
    setPartie(f);
  };

  // Clavier physique (ordinateur).
  useEffect(() => {
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
  }, [grille]);

  if (erreurs.length > 0) {
    return (
      <div className="ecran-erreur">
        <h1>Grille invalide</h1>
        <ul>
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  const mot = grille.mots[partie.motActif];

  const surVerifier = () => {
    const p = verifier(grille, partie);
    const n = nombreFausses(p);
    setPartie(p);
    setMessage(n === 0 ? 'Aucune erreur pour l’instant.' : n === 1 ? '1 lettre à corriger.' : `${n} lettres à corriger.`);
  };

  return (
    <div className="app">
      <header className="entete">
        <span className="marque">Les Mots Fléchés</span>
        <span className="titre-grille">
          Grille {grille.id} · {grille.titre}
        </span>
      </header>

      <main className="zone-grille">
        <VueGrille
          grille={grille}
          partie={partie}
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
        <button onClick={surVerifier}>Vérifier</button>
        <button onClick={() => agir((p) => indice(grille, p))}>Indice</button>
        <button onClick={() => agir((p) => effacerMot(grille, p))}>Effacer le mot</button>
      </section>

      <Clavier
        surLettre={(l) => agir((p) => saisirLettre(grille, p, l))}
        surEffacer={() => agir((p) => effacer(grille, p))}
      />

      {terminee && (
        <div className="victoire" role="dialog" aria-label="Grille terminée">
          <div className="carte">
            <h2>Bravo !</h2>
            <p>Grille terminée.</p>
            <p className="detail">
              {partie.indices === 0 ? 'Sans aucun indice.' : `Indices utilisés : ${partie.indices}`}
            </p>
            <button onClick={() => agir(() => creerPartie(grille))}>Rejouer</button>
          </div>
        </div>
      )}
    </div>
  );
}
