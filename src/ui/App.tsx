import { useMemo, useRef, useState } from 'react';
import { GRILLES, IDS } from '../grilles';
import { partieCompatible, type Partie } from '../engine/partie';
import { cleDefi, grilleDuDefi, terminerGrille } from '../progression/defi';
import { grilleAJouer, grilleSuivante } from '../progression/progression';
import { nouvellesRecompenses, recompenses } from '../progression/recompenses';
import { dateDuJour, enregistrerJour } from '../progression/statistiques';
import { charger, enregistrer, sauvegardeVide, stockageNavigateur, type Sauvegarde } from '../storage/sauvegarde';
import { Accueil } from './Accueil';
import { Collection } from './Collection';
import { Jeu } from './Jeu';
import { Parcours } from './Parcours';
import { Reglages } from './Reglages';
import { Statistiques } from './Statistiques';

type Ecran = { nom: 'accueil' } | { nom: 'parcours' } | { nom: 'stats' } | { nom: 'collection' } | { nom: 'jeu'; id: string } | { nom: 'defi' };

export function App() {
  const stockage = useMemo(stockageNavigateur, []);
  const aujourdhui = dateDuJour(new Date());
  const [sauvegarde, definir] = useState<Sauvegarde>(() => {
    const s = charger(stockage);
    // On note le jour de jeu et on oublie les défis commencés les jours précédents.
    const enCours = Object.fromEntries(Object.entries(s.enCours).filter(([cle]) => !cle.startsWith('defi:') || cle === cleDefi(aujourdhui)));
    return { ...s, enCours, stats: enregistrerJour(s.stats, aujourdhui) };
  });
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const [reglagesOuverts, setReglagesOuverts] = useState(false);
  const [nouvelles, setNouvelles] = useState<string[]>([]);

  // Chaque changement est écrit tout de suite dans le navigateur, sans attendre le prochain affichage :
  // même si la page est fermée aussitôt après une frappe, rien n'est perdu.
  const courante = useRef(sauvegarde);
  const premiere = useRef(true);
  if (premiere.current) {
    premiere.current = false;
    enregistrer(stockage, sauvegarde);
  }
  const setSauvegarde = (f: (s: Sauvegarde) => Sauvegarde) => {
    const suivante = f(courante.current);
    courante.current = suivante;
    enregistrer(stockage, suivante);
    definir(suivante);
  };

  const aller = (e: Ecran) => {
    setNouvelles([]);
    setEcran(e);
  };
  const accueil = () => aller({ nom: 'accueil' });
  const idDefi = grilleDuDefi(IDS, aujourdhui);

  let contenu;
  if (ecran.nom === 'jeu' || ecran.nom === 'defi') {
    const enDefi = ecran.nom === 'defi';
    const id = enDefi ? idDefi : ecran.id;
    const grille = GRILLES.find((g) => g.id === id)!;
    const cle = enDefi ? cleDefi(aujourdhui) : id;
    const sauvee = sauvegarde.enCours[cle];
    const suivante = enDefi ? null : grilleSuivante(IDS, id);
    contenu = (
      <Jeu
        key={cle}
        grille={grille}
        etiquette={enDefi ? 'Défi du jour' : `Niveau ${IDS.indexOf(id) + 1}`}
        partieInitiale={partieCompatible(grille, sauvee) ? sauvee : null}
        signalerMotsJustes={sauvegarde.reglages.signalerMotsJustes}
        enPause={reglagesOuverts}
        aSuivante={suivante !== null}
        nouvellesRecompenses={nouvelles}
        surPartie={(p: Partie) => setSauvegarde((s) => ({ ...s, enCours: { ...s.enCours, [cle]: p } }))}
        surTerminee={(indices, secondes) => {
          const fin = { cle, idGrille: id, defiDuJour: enDefi ? aujourdhui : null, indices, secondes };
          const avant = courante.current;
          setNouvelles(nouvellesRecompenses(recompenses(avant, GRILLES, aujourdhui), recompenses(terminerGrille(avant, fin), GRILLES, aujourdhui)));
          setSauvegarde((s) => terminerGrille(s, fin));
        }}
        surRetour={() => aller(enDefi ? { nom: 'accueil' } : { nom: 'parcours' })}
        surSuivante={() => suivante && aller({ nom: 'jeu', id: suivante })}
        surMenu={() => setReglagesOuverts(true)}
      />
    );
  } else if (ecran.nom === 'parcours') {
    contenu = (
      <Parcours
        grilles={GRILLES}
        progression={sauvegarde.progression}
        enCours={Object.keys(sauvegarde.enCours)}
        surJouer={(id) => aller({ nom: 'jeu', id })}
        surRetour={accueil}
      />
    );
  } else if (ecran.nom === 'stats') {
    contenu = <Statistiques sauvegarde={sauvegarde} ids={IDS} aujourdhui={aujourdhui} surRetour={accueil} />;
  } else if (ecran.nom === 'collection') {
    contenu = <Collection recompenses={recompenses(sauvegarde, GRILLES, aujourdhui)} surRetour={accueil} />;
  } else {
    contenu = (
      <Accueil
        ids={IDS}
        progression={sauvegarde.progression}
        partieEnCours={Object.keys(sauvegarde.enCours).some((cle) => !cle.startsWith('defi:'))}
        defiReussi={!!sauvegarde.defis[aujourdhui]}
        surJouer={() => aller({ nom: 'jeu', id: grilleAJouer(IDS, sauvegarde.progression) })}
        surDefi={() => aller({ nom: 'defi' })}
        surParcours={() => aller({ nom: 'parcours' })}
        surStats={() => aller({ nom: 'stats' })}
        surCollection={() => aller({ nom: 'collection' })}
        surReglages={() => setReglagesOuverts(true)}
      />
    );
  }

  return (
    <div className="app">
      {contenu}
      {reglagesOuverts && (
        <Reglages
          reglages={sauvegarde.reglages}
          surChange={(reglages) => setSauvegarde((s) => ({ ...s, reglages }))}
          surReinitialiser={() => {
            const vide = sauvegardeVide();
            setSauvegarde((s) => ({ ...vide, reglages: s.reglages, stats: enregistrerJour(vide.stats, aujourdhui) }));
            aller({ nom: 'accueil' });
            setReglagesOuverts(false);
          }}
          surFermer={() => setReglagesOuverts(false)}
        />
      )}
    </div>
  );
}
