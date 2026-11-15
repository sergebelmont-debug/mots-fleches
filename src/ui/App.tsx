import { useEffect, useMemo, useState } from 'react';
import { GRILLES, IDS } from '../grilles';
import { partieCompatible, type Partie } from '../engine/partie';
import { enregistrerResultat, grilleAJouer, grilleSuivante } from '../progression/progression';
import { charger, enregistrer, sauvegardeVide, stockageNavigateur, type Sauvegarde } from '../storage/sauvegarde';
import { Accueil } from './Accueil';
import { Jeu } from './Jeu';
import { Parcours } from './Parcours';
import { Reglages } from './Reglages';

type Ecran = { nom: 'accueil' } | { nom: 'parcours' } | { nom: 'jeu'; id: string };

export function App() {
  const stockage = useMemo(stockageNavigateur, []);
  const [sauvegarde, setSauvegarde] = useState<Sauvegarde>(() => charger(stockage));
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  const [reglagesOuverts, setReglagesOuverts] = useState(false);

  useEffect(() => {
    enregistrer(stockage, sauvegarde);
  }, [stockage, sauvegarde]);

  const jouer = (id: string) => setEcran({ nom: 'jeu', id });
  const grille = ecran.nom === 'jeu' ? GRILLES.find((g) => g.id === ecran.id) : undefined;

  let contenu;
  if (ecran.nom === 'jeu' && grille) {
    const sauvee = sauvegarde.enCours[grille.id];
    const suivante = grilleSuivante(IDS, grille.id);
    contenu = (
      <Jeu
        key={grille.id}
        grille={grille}
        numero={IDS.indexOf(grille.id) + 1}
        partieInitiale={partieCompatible(grille, sauvee) ? sauvee : null}
        signalerMotsJustes={sauvegarde.reglages.signalerMotsJustes}
        enPause={reglagesOuverts}
        aSuivante={suivante !== null}
        surPartie={(p: Partie) => setSauvegarde((s) => ({ ...s, enCours: { ...s.enCours, [grille.id]: p } }))}
        surTerminee={(indices) =>
          setSauvegarde((s) => {
            const enCours = { ...s.enCours };
            delete enCours[grille.id];
            return { ...s, enCours, progression: enregistrerResultat(s.progression, grille.id, indices) };
          })
        }
        surRetour={() => setEcran({ nom: 'parcours' })}
        surSuivante={() => suivante && jouer(suivante)}
        surMenu={() => setReglagesOuverts(true)}
      />
    );
  } else if (ecran.nom === 'parcours') {
    contenu = (
      <Parcours
        grilles={GRILLES}
        progression={sauvegarde.progression}
        enCours={Object.keys(sauvegarde.enCours)}
        surJouer={jouer}
        surRetour={() => setEcran({ nom: 'accueil' })}
      />
    );
  } else {
    contenu = (
      <Accueil
        ids={IDS}
        progression={sauvegarde.progression}
        partieEnCours={Object.keys(sauvegarde.enCours).length > 0}
        surJouer={() => jouer(grilleAJouer(IDS, sauvegarde.progression))}
        surParcours={() => setEcran({ nom: 'parcours' })}
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
            setSauvegarde((s) => ({ ...sauvegardeVide(), reglages: s.reglages }));
            setEcran({ nom: 'accueil' });
            setReglagesOuverts(false);
          }}
          surFermer={() => setReglagesOuverts(false)}
        />
      )}
    </div>
  );
}
