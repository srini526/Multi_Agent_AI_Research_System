const INK = "#1b1b2f";

function Star({ x, y, s = 1, d = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="star"
        style={{ animationDelay: `${d}s` }}
        d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z"
        fill="#FFD23F"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Extras({ state }) {
  if (state === "waiting") {
    return (
      <g fill={INK} fontFamily="Fredoka, sans-serif" fontWeight="700">
        <text className="z z1" x="158" y="44" fontSize="24">
          z
        </text>
        <text className="z z2" x="172" y="28" fontSize="17">
          z
        </text>
      </g>
    );
  }
  if (state === "done") {
    return (
      <g>
        <Star x={26} y={44} d={0} />
        <Star x={176} y={58} s={0.8} d={0.25} />
        <Star x={170} y={20} s={0.6} d={0.5} />
      </g>
    );
  }
  return null;
}

function Face({ state, cx, cy, gap = 20, mouth = true, mouthDy = 26, bare = false, r = 9 }) {
  const lx = cx - gap;
  const rx = cx + gap;
  const arc = (x, up) => (
    <path
      d={`M${x - 8} ${cy + (up ? 3 : 0)} Q${x} ${cy + (up ? -9 : 8)} ${x + 8} ${cy + (up ? 3 : 0)}`}
      fill="none"
      stroke={INK}
      strokeWidth="4"
      strokeLinecap="round"
    />
  );

  let eyes;
  if (state === "done") {
    eyes = (
      <>
        {arc(lx, true)}
        {arc(rx, true)}
      </>
    );
  } else if (state === "waiting") {
    eyes = (
      <>
        {arc(lx, false)}
        {arc(rx, false)}
      </>
    );
  } else {
    const px = state === "working" ? -1.5 : 1;
    const py = state === "working" ? 3 : 1;
    const eye = (x) => (
      <g key={x}>
        {!bare && <circle cx={x} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="3" />}
        <g className="pupil">
          <circle cx={x + px} cy={cy + py} r={bare ? 6.5 : r * 0.52} fill={INK} />
          <circle cx={x + px + 1.8} cy={cy + py - 1.8} r="1.8" fill="#fff" />
        </g>
      </g>
    );
    eyes = (
      <g className="blink">
        {eye(lx)}
        {eye(rx)}
      </g>
    );
  }

  const my = cy + mouthDy;
  let m = null;
  if (mouth) {
    if (state === "done") {
      m = (
        <path
          d={`M${cx - 13} ${my - 3} Q${cx} ${my + 16} ${cx + 13} ${my - 3} Z`}
          fill="#fff"
          stroke={INK}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      );
    } else if (state === "working") {
      m = <ellipse className="chew" cx={cx} cy={my} rx="5" ry="4" fill={INK} />;
    } else if (state === "waiting") {
      m = <path d={`M${cx - 6} ${my} L${cx + 6} ${my}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />;
    } else {
      m = (
        <path
          d={`M${cx - 10} ${my - 2} Q${cx} ${my + 10} ${cx + 10} ${my - 2}`}
          fill="none"
          stroke={INK}
          strokeWidth="4"
          strokeLinecap="round"
        />
      );
    }
  }

  return (
    <g>
      {eyes}
      {m}
      {state === "done" && (
        <>
          <circle cx={lx - 9} cy={cy + 14} r="5.5" fill="#FF8FB3" opacity=".75" />
          <circle cx={rx + 9} cy={cy + 14} r="5.5" fill="#FF8FB3" opacity=".75" />
        </>
      )}
    </g>
  );
}

const Shadow = () => <ellipse cx="100" cy="190" rx="60" ry="8" fill={INK} opacity=".12" />;

/* ---------------------------- Scout (search) ---------------------------- */
export function Scout({ state }) {
  return (
    <svg viewBox="0 0 200 200" className="char-svg" role="img" aria-label="Scout, the search agent">
      <Shadow />
      <g className={`cbody ${state}`}>
        <line x1="100" y1="44" x2="100" y2="22" className="ol" fill="none" />
        <circle cx="100" cy="17" r="8" fill="#FF6B9D" className="ol antenna" />
        <rect x="20" y="92" width="16" height="34" rx="8" fill="#FFD23F" className="ol" />
        <rect x="164" y="92" width="16" height="34" rx="8" fill="#FFD23F" className="ol" />
        <rect x="32" y="44" width="136" height="124" rx="48" fill="#4D96FF" className="ol" />
        <rect x="50" y="68" width="100" height="70" rx="28" fill="#EAF4FF" className="ol" />
        <Face state={state} cx={100} cy={96} gap={22} mouthDy={26} />
        <circle cx="100" cy="154" r="6" fill={state === "working" ? "#FFD23F" : "#fff"} className="ol" />
        <g transform="translate(150 146)">
          <g className={`mag-in ${state}`}>
            <circle r="17" fill="#CDEBFF" fillOpacity=".9" className="ol" />
            <path d="M-8 -6 A10 10 0 0 1 2 -10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
            <line x1="12" y1="12" x2="30" y2="30" stroke={INK} strokeWidth="9" strokeLinecap="round" />
            <line x1="12" y1="12" x2="29" y2="29" stroke="#FF9F43" strokeWidth="4" strokeLinecap="round" />
          </g>
        </g>
      </g>
      <Extras state={state} />
    </svg>
  );
}

/* --------------------------- Bookworm (reader) -------------------------- */
export function Bookworm({ state }) {
  return (
    <svg viewBox="0 0 200 200" className="char-svg" role="img" aria-label="Bookworm, the reader agent">
      <Shadow />
      <g className={`cbody ${state}`}>
        <path d="M100 38 q-6 -22 16 -26 q4 18 -16 26z" fill="#2FA84F" className="ol" />
        <rect x="46" y="36" width="108" height="132" rx="54" fill="#6BCB77" className="ol" />
        <ellipse cx="100" cy="136" rx="32" ry="26" fill="#D4F5D8" />
        <circle cx="76" cy="86" r="21" fill="#fff" className="ol" />
        <circle cx="124" cy="86" r="21" fill="#fff" className="ol" />
        <line x1="97" y1="86" x2="103" y2="86" className="ol" />
        <Face state={state} cx={100} cy={86} gap={24} mouthDy={32} bare />
        <path d="M100 152 L52 144 L52 182 L100 190 Z" fill="#fff" className="ol" />
        <path d="M100 152 L148 144 L148 182 L100 190 Z" fill="#FFF3C4" className="ol" />
        <g stroke={INK} strokeWidth="2" opacity=".3" strokeLinecap="round">
          <line x1="62" y1="154" x2="90" y2="159" />
          <line x1="62" y1="162" x2="90" y2="167" />
          <line x1="62" y1="170" x2="90" y2="175" />
        </g>
        <path className={`ol page ${state}`} d="M100 152 L148 144 L148 182 L100 190 Z" fill="#fff" />
      </g>
      <Extras state={state} />
    </svg>
  );
}

/* --------------------------- Scribbles (writer) ------------------------- */
export function Scribbles({ state }) {
  return (
    <svg viewBox="0 0 200 200" className="char-svg" role="img" aria-label="Scribbles, the writer agent">
      <Shadow />
      <g className={`cbody ${state}`}>
        <ellipse cx="100" cy="108" rx="64" ry="62" fill="#FF6B9D" className="ol" />
        <ellipse cx="100" cy="132" rx="36" ry="26" fill="#FFC2D9" />
        <ellipse cx="96" cy="52" rx="40" ry="15" fill="#9B5DE5" className="ol" />
        <circle cx="96" cy="36" r="5" fill="#9B5DE5" className="ol" />
        <Face state={state} cx={100} cy={98} gap={22} mouthDy={26} />
        <g transform="rotate(-4 92 169)">
          <rect x="52" y="150" width="80" height="38" rx="4" fill="#fff" className="ol" />
          <path
            className={`squig ${state}`}
            d="M60 162 q6 -8 12 0 t12 0 t12 0 t12 0 M60 174 q6 -8 12 0 t12 0 t12 0"
            fill="none"
            stroke="#4D96FF"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <g transform="translate(152 132) rotate(32)">
          <g className={`pencil-in ${state}`}>
            <rect x="-6" y="-34" width="12" height="52" fill="#FFD23F" className="ol" />
            <polygon points="-6,18 6,18 0,32" fill="#FFE8B0" className="ol" />
            <polygon points="-2,27 2,27 0,32" fill={INK} />
            <rect x="-6" y="-44" width="12" height="10" rx="2" fill="#FF8FB3" className="ol" />
          </g>
        </g>
      </g>
      <Extras state={state} />
    </svg>
  );
}

/* ---------------------------- Prof. Red (critic) ------------------------ */
export function ProfRed({ state }) {
  return (
    <svg viewBox="0 0 200 200" className="char-svg" role="img" aria-label="Professor Red, the critic agent">
      <Shadow />
      <g className={`cbody ${state}`}>
        <polygon points="52,52 56,16 84,40" fill="#9B5DE5" className="ol" />
        <polygon points="148,52 144,16 116,40" fill="#9B5DE5" className="ol" />
        <path
          d="M44 74 Q44 34 100 34 Q156 34 156 74 L156 148 Q156 172 100 172 Q44 172 44 148 Z"
          fill="#9B5DE5"
          className="ol"
        />
        <ellipse cx="100" cy="142" rx="34" ry="26" fill="#D9C2FF" />
        <path
          d="M84 134 q6 6 12 0 M104 134 q6 6 12 0 M94 150 q6 6 12 0"
          stroke="#9B5DE5"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="76" cy="88" r="23" fill="#fff" className="ol" />
        <circle cx="124" cy="88" r="23" fill="#fff" className="ol" />
        <line x1="98" y1="88" x2="102" y2="88" className="ol" />
        <Face state={state} cx={100} cy={88} gap={24} mouth={false} bare />
        <polygon points="92,106 108,106 100,121" fill="#FF9F43" className="ol" />
        <g transform="rotate(-5 72 171)">
          <rect x="40" y="152" width="64" height="38" rx="5" fill="#fff" className="ol" />
          <rect x="62" y="148" width="20" height="8" rx="3" fill="#FFD23F" className="ol" />
          <path
            className={`check ${state}`}
            pathLength="1"
            d="M52 172 l8 8 l14 -16"
            fill="none"
            stroke="#FF4D4D"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g transform="translate(152 150) rotate(28)">
          <g className={`pen-in ${state}`}>
            <rect x="-5" y="-32" width="10" height="44" rx="4" fill="#FF4D4D" className="ol" />
            <polygon points="-5,12 5,12 0,24" fill="#FFE8B0" className="ol" />
            <polygon points="-2,19 2,19 0,24" fill="#FF4D4D" />
          </g>
        </g>
      </g>
      <Extras state={state} />
    </svg>
  );
}

export const CHARS = [Scout, Bookworm, Scribbles, ProfRed];
