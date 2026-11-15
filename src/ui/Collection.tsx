import type { Recompense } from '../progression/recompenses';

export function Collection({ recompenses, surRetour }: { recompenses: Recompense[]; surRetour: () => void }) {
  const obtenues = recompenses.filter((r) => r.obtenue).length;
  return (
    <div className="ecran page">
      <header className="barre">
        <button className="rond" aria-label="Retour à l'accueil" onClick={surRetour}>
          ←
        </button>
        <span className="barre-titre">Collection</span>
        <span className="barre-etoiles">
          🏅 {obtenues}/{recompenses.length}
        </span>
      </header>
      <div className="page-contenu">
        <ul className="medailles">
          {recompenses.map((r) => (
            <li key={r.id} className={`medaille ${r.obtenue ? 'obtenue' : ''}`} data-recompense={r.id}>
              <span className="medaille-icone" aria-hidden="true">
                {r.obtenue ? '🏅' : '🔒'}
              </span>
              <span className="medaille-texte">
                <strong>{r.titre}</strong>
                <small>{r.description}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
