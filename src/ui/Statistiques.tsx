import { formaterDuree, resumer } from '../progression/statistiques';
import type { Sauvegarde } from '../storage/sauvegarde';

interface Props {
  sauvegarde: Sauvegarde;
  ids: string[];
  aujourdhui: string;
  surRetour: () => void;
}

export function Statistiques({ sauvegarde, ids, aujourdhui, surRetour }: Props) {
  const r = resumer(sauvegarde, ids, aujourdhui);
  const jours = (n: number) => `${n} jour${n > 1 ? 's' : ''}`;
  const tuiles: [string, string][] = [
    ['Grilles terminées', `${r.terminees} / ${r.total}`],
    ['Étoiles', `${r.etoiles} / ${r.etoilesMax}`],
    ['Réussies sans indice', r.terminees ? `${r.tauxSansIndice} %` : '—'],
    ['Indices utilisés', String(r.indicesTotal)],
    ['Temps moyen par grille', r.tempsMoyen === null ? '—' : formaterDuree(r.tempsMoyen)],
    ['Meilleur temps', r.meilleurTemps === null ? '—' : formaterDuree(r.meilleurTemps)],
    ['Série en cours', jours(r.serieActuelle)],
    ['Meilleure série', jours(r.serieRecord)],
    ['Défis du jour réussis', String(r.defisReleves)],
    ['Temps de jeu total', formaterDuree(r.tempsTotal)],
  ];
  return (
    <div className="ecran page">
      <header className="barre">
        <button className="rond" aria-label="Retour à l'accueil" onClick={surRetour}>
          ←
        </button>
        <span className="barre-titre">Statistiques</span>
      </header>
      <div className="page-contenu">
        <div className="tuiles">
          {tuiles.map(([nom, valeur]) => (
            <div key={nom} className="tuile">
              <strong>{valeur}</strong>
              <span>{nom}</span>
            </div>
          ))}
        </div>
        <p className="a-venir">Ces statistiques sont enregistrées sur cet appareil.</p>
      </div>
    </div>
  );
}
