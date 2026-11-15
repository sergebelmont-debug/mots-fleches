/** Trois étoiles, dont « nombre » sont allumées. */
export function Etoiles({ nombre, anime = false }: { nombre: number; anime?: boolean }) {
  return (
    <span className={`etoiles ${anime ? 'anime' : ''}`} role="img" aria-label={`${nombre} étoile${nombre > 1 ? 's' : ''} sur 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`etoile ${i <= nombre ? 'pleine' : ''}`} style={{ animationDelay: `${0.25 + i * 0.22}s` }}>
          ★
        </span>
      ))}
    </span>
  );
}
