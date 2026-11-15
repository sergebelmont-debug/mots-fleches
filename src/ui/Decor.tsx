/** Décor de rue la nuit : réverbère, lueur chaude, toits et étoiles. Purement décoratif. */
export function Decor() {
  return (
    <svg className="decor" viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="lueur" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.95" />
          <stop offset="25%" stopColor="#f5a93b" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f5a93b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="paves" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a3a1c" />
          <stop offset="100%" stopColor="#1d120b" />
        </linearGradient>
      </defs>

      {[
        [60, 70], [130, 40], [215, 85], [290, 50], [350, 110], [180, 150], [330, 190], [40, 180],
      ].map(([x, y], i) => (
        <circle key={i} className="etoile-ciel" cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1} style={{ animationDelay: `${i * 0.7}s` }} />
      ))}

      {/* Toits au loin */}
      <path
        fill="#1a1016"
        d="M0 560 L0 470 L30 470 L30 440 L42 440 L42 470 L70 470 L95 440 L120 470 L150 470 L150 420 L162 420 L162 455 L200 455 L225 425 L250 455 L290 455 L290 430 L300 430 L300 455 L330 455 L355 430 L380 455 L400 455 L400 560 Z"
      />
      {/* Façades proches */}
      <path fill="#24161a" d="M0 800 L0 520 L60 520 L60 500 L110 500 L110 540 L400 540 L400 800 Z" />
      {[
        [18, 545], [70, 530], [150, 565], [210, 565], [270, 565], [335, 565], [150, 615], [270, 615],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="22" height="30" rx="2" fill={i % 3 === 1 ? '#f2b63c' : '#3a2620'} opacity={i % 3 === 1 ? 0.75 : 1} />
      ))}
      <rect x="0" y="690" width="400" height="110" fill="url(#paves)" />

      {/* Réverbère */}
      <circle className="halo" cx="62" cy="330" r="150" fill="url(#lueur)" />
      <rect x="58" y="350" width="8" height="350" fill="#0f0a0a" />
      <rect x="50" y="690" width="24" height="14" rx="3" fill="#0f0a0a" />
      <path d="M46 350 L78 350 L72 312 L52 312 Z" fill="#ffe2a0" stroke="#0f0a0a" strokeWidth="4" strokeLinejoin="round" />
      <path d="M48 312 L76 312 L62 294 Z" fill="#0f0a0a" />
    </svg>
  );
}
