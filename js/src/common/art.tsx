import type Mithril from 'mithril';

/*
 * The pet, drawn in SVG: three species (dumpling, sprout, comet), each in
 * three skins, at four stages (egg, baby, adult, special form), in six
 * moods. Moods are classes on the root; the movement (blinking, breathing,
 * hopping, the Zzz) is CSS in less/art.less, switched off for readers who
 * ask for less motion. All original art.
 *
 * These are plain functions, called as functions: a plain function used as
 * a JSX tag is a closure component in Mithril and renders nothing.
 */

export type Species = 'dumpling' | 'sprout' | 'comet';
export type Mood = 'idle' | 'happy' | 'eating' | 'sleepy' | 'excited' | 'celebrating';
export type Action = 'feed' | 'play' | null;

export interface ArtAttrs {
  species: string;
  skin: string;
  stage: number;
  mood: string;
  hat?: string | null;
  action?: Action;
  art?: Record<string, string> | any[];
  label?: string;
}

const INK = '#3d2f3b';

/** body, shade, belly, accent (cheeks, details), leaf */
type Palette = [string, string, string, string, string];

export const SKINS: Record<Species, Record<string, Palette>> = {
  dumpling: {
    peach: ['#f7c59f', '#e29f73', '#fff1e3', '#f28b82', '#e29f73'],
    snow: ['#f1f3f9', '#c9d0e0', '#ffffff', '#f4a6b8', '#c9d0e0'],
    cocoa: ['#bd8763', '#8f5e40', '#efd6c2', '#f2a08a', '#8f5e40'],
  },
  sprout: {
    meadow: ['#9edb8f', '#64b05c', '#e6f7dc', '#f59fa0', '#4fae55'],
    mint: ['#a6e8d4', '#5fbfa2', '#ecfbf6', '#f6a5b5', '#3fa784'],
    autumn: ['#f5c07a', '#d28b33', '#fdeccf', '#e9785c', '#d0612f'],
  },
  comet: {
    sky: ['#a3c7ff', '#6894e3', '#e8f1ff', '#ffd166', '#6894e3'],
    ember: ['#ffab84', '#e47447', '#ffe8db', '#ffd166', '#e47447'],
    violet: ['#c7b1ff', '#8f76e6', '#f2eeff', '#ffd166', '#8f76e6'],
  },
};

export const SPECIES = Object.keys(SKINS) as Species[];

export function palette(species: string, skin: string): Palette {
  const skins = SKINS[(species in SKINS ? species : 'dumpling') as Species];
  return skins[skin] || Object.values(skins)[0];
}

/** Where a hat sits (the top of the head), by species. */
const HEAD: Record<Species, number> = { dumpling: 66, sprout: 64, comet: 58 };
/** Eye line, by species. */
const EYES: Record<Species, number> = { dumpling: 116, sprout: 118, comet: 122 };

let uid = 0;

/** The mood the face shows: an action in progress wins over the forum's mood. */
export function faceMood(mood: string, action?: Action): Mood {
  if (action === 'feed') return 'eating';
  if (action === 'play') return 'happy';
  return (['idle', 'happy', 'eating', 'sleepy', 'excited', 'celebrating'].includes(mood) ? mood : 'idle') as Mood;
}

export function petArt(attrs: ArtAttrs): Mithril.Children {
  const species = (attrs.species in SKINS ? attrs.species : 'dumpling') as Species;
  const pal = palette(species, attrs.skin);
  const stage = Math.max(0, Math.min(3, attrs.stage | 0));
  const mood = faceMood(attrs.mood, attrs.action);
  const hat = attrs.hat || (mood === 'celebrating' && stage > 0 ? 'party' : null);
  const custom = stage > 0 && attrs.art && !Array.isArray(attrs.art) ? attrs.art[mood] || (mood === 'eating' ? attrs.art.happy : null) : null;

  const classes = ['Pet', `Pet--${mood}`, `Pet--stage${stage}`, `Pet--${species}`];
  if (attrs.action) classes.push(`Pet--${attrs.action}`);

  if (custom) {
    return (
      <div className={classes.concat('Pet--custom').join(' ')} role="img" aria-label={attrs.label}>
        {stage === 3 ? <span className="Pet-auraCustom" /> : null}
        <img className="Pet-customImg" src={custom} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }

  const id = `fpet${++uid}`;

  return (
    <svg class={classes.join(' ')} viewBox="0 0 200 200" role="img" aria-label={attrs.label} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0%" stop-color={pal[3]} stop-opacity="0.75" />
          <stop offset="55%" stop-color={pal[0]} stop-opacity="0.35" />
          <stop offset="100%" stop-color={pal[0]} stop-opacity="0" />
        </radialGradient>
        <clipPath id={`${id}-egg`}>
          <path d={EGG} />
        </clipPath>
      </defs>

      {stage === 3 ? aura(id) : null}
      <ellipse class="Pet-shadow" cx="100" cy="186" rx={stage === 0 ? 46 : species === 'comet' ? 36 : 50} ry="7" />

      <g class="Pet-hop">
        <g transform={stage === 1 ? 'translate(100 184) scale(0.74) translate(-100 -184)' : undefined}>
          <g class="Pet-body">
            {stage === 0 ? egg(species, pal, id) : body(species, pal, stage)}
            {stage === 0 ? null : face(species, pal, mood)}
            {stage === 1 && !hat ? shell(species) : null}
            {stage === 3 && !hat && species !== 'sprout' ? crown(HEAD[species]) : null}
            {stage > 0 && hat ? hatArt(hat, HEAD[species]) : null}
          </g>
        </g>
      </g>

      {stage === 0 ? nest() : null}
      {extras(mood, stage, attrs.action || null, species)}
    </svg>
  );
}

/* ---------------------------------------------------------------- egg */

const EGG = 'M100 46 C136 46 158 100 158 136 C158 168 132 184 100 184 C68 184 42 168 42 136 C42 100 64 46 100 46 Z';

function egg(species: Species, pal: Palette, id: string): Mithril.Children {
  let pattern: Mithril.Children;
  if (species === 'dumpling') {
    pattern = [
      [76, 96, 10],
      [118, 80, 7],
      [128, 128, 12],
      [82, 150, 9],
      [106, 114, 5],
      [60, 128, 5],
    ].map(([cx, cy, r]) => <circle cx={cx} cy={cy} r={r} fill={pal[0]} />);
  } else if (species === 'sprout') {
    pattern = [
      <path
        d="M40 122 L56 110 L72 122 L88 110 L104 122 L120 110 L136 122 L152 110 L162 118 L162 134 L152 126 L136 138 L120 126 L104 138 L88 126 L72 138 L56 126 L40 138 Z"
        fill={pal[4]}
        opacity="0.85"
      />,
      <circle cx="84" cy="86" r="5" fill={pal[0]} />,
      <circle cx="118" cy="160" r="6" fill={pal[0]} />,
    ];
  } else {
    pattern = [
      [74, 98, 8],
      [124, 86, 6],
      [130, 140, 9],
      [80, 152, 6],
      [104, 120, 5],
    ].map(([cx, cy, r]) => <path d={star(cx, cy, r, r * 0.45)} fill={pal[0]} />);
  }

  return (
    <g class="Pet-egg">
      <path d={EGG} fill={pal[2]} />
      <g clip-path={`url(#${id}-egg)`}>
        {pattern}
        <path d="M42 150 C60 176 140 176 158 150 L158 190 L42 190 Z" fill={pal[1]} opacity="0.25" />
      </g>
      <path d={EGG} fill="none" stroke={INK} stroke-width="4" />
      <path d="M72 84 C78 70 88 62 96 61" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.75" />
      <path
        class="Pet-crack"
        d="M54 112 L66 104 L76 114 L88 102 L100 114 L112 102 L124 114 L134 104 L146 112"
        fill="none"
        stroke={INK}
        stroke-width="3.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </g>
  );
}

function nest(): Mithril.Children {
  return (
    <g class="Pet-nest">
      <path d="M30 168 C40 194 160 194 170 168 C156 180 44 180 30 168 Z" fill="#c98b4f" stroke={INK} stroke-width="4" stroke-linejoin="round" />
      <path d="M44 176 L70 172 M84 182 L112 176 M126 180 L152 172 M58 184 L80 186" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round" />
    </g>
  );
}

/* --------------------------------------------------------------- body */

function body(species: Species, pal: Palette, stage: number): Mithril.Children {
  const [skin, shade, belly, accent, leaf] = pal;
  const line = { stroke: INK, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };

  if (species === 'sprout') {
    return (
      <g>
        <ellipse cx="78" cy="180" rx="14" ry="7.5" fill={shade} {...line} />
        <ellipse cx="122" cy="180" rx="14" ry="7.5" fill={shade} {...line} />
        <path class="Pet-armL" d="M44 132 C26 124 16 140 22 152 C36 154 46 146 44 132 Z" fill={leaf} {...line} />
        <path class="Pet-armR" d="M156 132 C174 124 184 140 178 152 C164 154 154 146 156 132 Z" fill={leaf} {...line} />
        <path d="M100 62 C146 62 164 98 164 134 C164 166 138 182 100 182 C62 182 36 166 36 134 C36 98 54 62 100 62 Z" fill={skin} {...line} />
        <path
          d="M42 146 C50 170 74 178 100 178 C126 178 150 170 158 146 C146 164 126 172 100 172 C74 172 54 164 42 146 Z"
          fill={shade}
          opacity="0.45"
        />
        <ellipse cx="100" cy="152" rx="32" ry="21" fill={belly} />
        <circle cx="60" cy="106" r="4" fill={shade} opacity="0.55" />
        <circle cx="142" cy="102" r="3.2" fill={shade} opacity="0.55" />
        <circle cx="150" cy="120" r="2.4" fill={shade} opacity="0.55" />
        <g class="Pet-leaves">
          <path d="M100 64 C100 56 101 48 104 40" fill="none" {...line} />
          <path d="M103 44 C92 28 72 28 62 37 C72 51 94 54 103 44 Z" fill={leaf} {...line} stroke-width="3.5" />
          <path d="M102 43 C90 38 78 37 70 38" fill="none" stroke={INK} stroke-width="2" opacity="0.45" stroke-linecap="round" />
          {stage >= 2 ? <path d="M105 41 C112 24 134 18 144 27 C136 43 116 48 105 41 Z" fill={leaf} {...line} stroke-width="3.5" /> : null}
          {stage >= 2 ? (
            <path d="M107 40 C118 33 130 29 138 28" fill="none" stroke={INK} stroke-width="2" opacity="0.45" stroke-linecap="round" />
          ) : null}
          {stage === 3 ? flower(104, 36, accent) : null}
        </g>
      </g>
    );
  }

  if (species === 'comet') {
    return (
      <g class="Pet-float">
        <g class="Pet-armL">
          <ellipse cx="44" cy="138" rx="9" ry="12" transform="rotate(25 44 138)" fill={skin} {...line} />
        </g>
        <g class="Pet-armR">
          <ellipse cx="156" cy="138" rx="9" ry="12" transform="rotate(-25 156 138)" fill={skin} {...line} />
        </g>
        <path
          d="M100 32 C106 48 118 54 132 68 C156 90 164 116 160 140 C156 168 132 182 100 182 C68 182 44 168 40 140 C36 116 44 90 68 68 C80 56 92 50 100 32 Z"
          fill={skin}
          {...line}
        />
        <path d="M100 38 C96 52 104 62 114 66 C104 68 96 74 96 86" fill="none" stroke={shade} stroke-width="5" stroke-linecap="round" opacity="0.6" />
        <path
          d="M46 150 C54 172 76 178 100 178 C124 178 146 172 154 150 C142 166 124 172 100 172 C76 172 58 166 46 150 Z"
          fill={shade}
          opacity="0.45"
        />
        <ellipse cx="100" cy="152" rx="32" ry="20" fill={belly} opacity="0.95" />
        <path class="Pet-tip" d={star(100, 28, 10, 4.5)} fill={accent} stroke={INK} stroke-width="3" stroke-linejoin="round" />
      </g>
    );
  }

  // dumpling
  return (
    <g>
      <g class="Pet-tail">
        <path d="M152 160 C180 156 184 124 166 118 C156 115 152 126 160 130" fill="none" stroke={INK} stroke-width="14" stroke-linecap="round" />
        <path d="M152 160 C180 156 184 124 166 118 C156 115 152 126 160 130" fill="none" stroke={skin} stroke-width="7" stroke-linecap="round" />
      </g>
      {ear(skin, accent, line)}
      <g transform="translate(200 0) scale(-1 1)">{ear(skin, accent, line)}</g>
      <ellipse cx="78" cy="180" rx="15" ry="8" fill={skin} {...line} />
      <ellipse cx="122" cy="180" rx="15" ry="8" fill={skin} {...line} />
      <path d="M100 64 C148 64 166 100 166 134 C166 166 140 182 100 182 C60 182 34 166 34 134 C34 100 52 64 100 64 Z" fill={skin} {...line} />
      <path d="M40 146 C48 170 74 178 100 178 C126 178 152 170 160 146 C148 164 126 172 100 172 C74 172 52 164 40 146 Z" fill={shade} opacity="0.4" />
      <ellipse cx="100" cy="152" rx="36" ry="22" fill={belly} />
      <g class="Pet-armL">
        <ellipse cx="52" cy="146" rx="9" ry="12" transform="rotate(-20 52 146)" fill={skin} {...line} />
      </g>
      <g class="Pet-armR">
        <ellipse cx="148" cy="146" rx="9" ry="12" transform="rotate(20 148 146)" fill={skin} {...line} />
      </g>
      <path d="M92 67 C92 56 100 52 102 60 C105 52 113 55 110 67" fill={skin} {...line} stroke-width="3.5" />
    </g>
  );
}

function ear(skin: string, accent: string, line: Record<string, any>): Mithril.Children {
  return (
    <g class="Pet-ear">
      <path d="M58 100 C50 74 58 54 69 56 C80 58 88 74 92 84 Z" fill={skin} {...line} />
      <path d="M64 92 C60 78 64 67 70 68 C76 70 81 78 83 84 Z" fill={accent} opacity="0.55" />
    </g>
  );
}

function flower(x: number, y: number, color: string): Mithril.Children {
  return (
    <g class="Pet-flower">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse cx={x} cy={y - 7} rx="5" ry="7" fill={color} stroke={INK} stroke-width="2" transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r="4.5" fill="#ffd166" stroke={INK} stroke-width="2" />
    </g>
  );
}

/** The bit of eggshell a baby still wears. */
function shell(species: Species): Mithril.Children {
  if (species === 'comet') return null;
  const t = HEAD[species];
  return (
    <path
      class="Pet-shell"
      d={`M64 ${t + 12} C66 ${t - 14} 134 ${t - 14} 136 ${t + 12} L127 ${t + 4} L118 ${t + 13} L109 ${t + 4} L100 ${t + 13} L91 ${t + 4} L82 ${t + 13} L73 ${t + 4} Z`}
      fill="#fffaf0"
      stroke={INK}
      stroke-width="3.5"
      stroke-linejoin="round"
    />
  );
}

/* --------------------------------------------------------------- face */

function face(species: Species, pal: Palette, mood: Mood): Mithril.Children {
  const y = EYES[species];
  const my = y + 17;
  const stroke = { stroke: INK, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' };
  const glad = mood === 'happy' || mood === 'celebrating' || mood === 'eating';
  // The comet's accent is its golden star; its cheeks stay rosy.
  const cheek = species === 'comet' ? '#ff9fb2' : pal[3];

  const eye = (x: number) => {
    if (glad) return <path d={`M${x - 7} ${y + 2} Q${x} ${y - 8} ${x + 7} ${y + 2}`} {...stroke} />;
    if (mood === 'sleepy') return <path d={`M${x - 7} ${y} Q${x} ${y + 6} ${x + 7} ${y}`} {...stroke} />;
    const big = mood === 'excited';
    return (
      <g>
        <ellipse cx={x} cy={y} rx={big ? 8 : 6.5} ry={big ? 9.5 : 8.5} fill={INK} />
        <circle cx={x + 2.4} cy={y - 3.2} r={big ? 3.2 : 2.5} fill="#fff" />
        <circle cx={x - 2.2} cy={y + 3.4} r={big ? 1.6 : 1.1} fill="#fff" opacity="0.85" />
      </g>
    );
  };

  let mouth: Mithril.Children;
  if (mood === 'sleepy') {
    mouth = <ellipse class="Pet-snore" cx="100" cy={my} rx="3.4" ry="2.8" fill={INK} />;
  } else if (mood === 'eating') {
    mouth = <ellipse class="Pet-chew" cx="100" cy={my} rx="6" ry="4.5" fill={INK} />;
  } else if (mood === 'idle') {
    mouth = <path d={`M93 ${my - 1} Q100 ${my + 5} 107 ${my - 1}`} {...stroke} stroke-width="3.5" />;
  } else {
    const w = mood === 'happy' ? 9 : 11;
    const d = mood === 'happy' ? 13 : 17;
    mouth = (
      <g>
        <path d={`M${100 - w} ${my - 2} Q100 ${my + d} ${100 + w} ${my - 2} Z`} fill={INK} stroke={INK} stroke-width="2.5" stroke-linejoin="round" />
        <path
          d={`M${100 - w / 2} ${my + d / 2 - 1} Q100 ${my + d / 2 + 4} ${100 + w / 2} ${my + d / 2 - 1} Q100 ${my + d / 2 - 4} ${100 - w / 2} ${my + d / 2 - 1}`}
          fill="#f47c86"
        />
      </g>
    );
  }

  return (
    <g class="Pet-face">
      <g class="Pet-eyes">
        {eye(82)}
        {eye(118)}
      </g>
      <ellipse class="Pet-cheek" cx="66" cy={y + 12} rx="8.5" ry="5" fill={cheek} opacity={glad || mood === 'excited' ? 0.8 : 0.5} />
      <ellipse class="Pet-cheek" cx="134" cy={y + 12} rx="8.5" ry="5" fill={cheek} opacity={glad || mood === 'excited' ? 0.8 : 0.5} />
      {mouth}
    </g>
  );
}

/* ------------------------------------------------------------ special */

function aura(id: string): Mithril.Children {
  return (
    <g class="Pet-aura">
      <circle cx="100" cy="118" r="94" fill={`url(#${id}-aura)`} />
      <g class="Pet-orbit">
        {[0, 60, 120, 180, 240, 300].map((a, i) => {
          const r = (a * Math.PI) / 180;
          return (
            <path
              d={star(100 + Math.cos(r) * 84, 118 + Math.sin(r) * 72, i % 2 ? 4 : 6, i % 2 ? 1.8 : 2.6)}
              fill="#fff8d6"
              stroke="#f5b83d"
              stroke-width="1.2"
            />
          );
        })}
      </g>
    </g>
  );
}

function crown(t: number): Mithril.Children {
  const y = t - 4;
  return (
    <g class="Pet-crown">
      <path
        d={`M80 ${y} L83 ${y - 18} L92 ${y - 8} L100 ${y - 22} L108 ${y - 8} L117 ${y - 18} L120 ${y} Z`}
        fill="#ffd166"
        stroke={INK}
        stroke-width="3"
        stroke-linejoin="round"
      />
      <circle cx="100" cy={y - 6} r="3" fill="#f47c86" />
      <circle cx="86" cy={y - 4} r="2" fill="#7cc7ff" />
      <circle cx="114" cy={y - 4} r="2" fill="#7cc7ff" />
    </g>
  );
}

/* --------------------------------------------------------------- hats */

function hatArt(hat: string, t: number): Mithril.Children {
  const line = { stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };

  switch (hat) {
    case 'party':
      return (
        <g class="Pet-hat">
          <path d={`M76 ${t + 4} L100 ${t - 48} L124 ${t + 4} Z`} fill="#ff6b8b" {...line} />
          <path d={`M84 ${t - 14} L112 ${t - 4} M90 ${t - 28} L106 ${t - 22}`} stroke="#ffd166" stroke-width="5" stroke-linecap="round" />
          <circle cx="100" cy={t - 50} r="7" fill="#ffd166" {...line} stroke-width="3" />
        </g>
      );
    case 'santa':
      return (
        <g class="Pet-hat">
          <path d={`M70 ${t + 2} C74 ${t - 36} 118 ${t - 54} 142 ${t - 26} C128 ${t - 30} 120 ${t - 20} 126 ${t + 2} Z`} fill="#d62e3b" {...line} />
          <rect x="64" y={t - 6} width="72" height="15" rx="7.5" fill="#fff" {...line} />
          <circle cx="143" cy={t - 26} r="8.5" fill="#fff" {...line} />
        </g>
      );
    case 'witch':
      return (
        <g class="Pet-hat">
          <ellipse cx="100" cy={t + 2} rx="48" ry="9" fill="#3b2a5c" {...line} />
          <path d={`M76 ${t} C84 ${t - 30} 92 ${t - 56} 116 ${t - 70} C110 ${t - 50} 118 ${t - 24} 124 ${t} Z`} fill="#4a3570" {...line} />
          <path d={`M79 ${t - 9} L121 ${t - 9}`} stroke="#f59e0b" stroke-width="7" />
        </g>
      );
    case 'tophat':
    case 'leprechaun': {
      const green = hat === 'leprechaun';
      const fill = green ? '#2e7d32' : '#2b2b33';
      return (
        <g class="Pet-hat">
          <ellipse cx="100" cy={t + 2} rx="42" ry="8" fill={fill} {...line} />
          <rect x="76" y={t - 44} width="48" height="46" rx="4" fill={fill} {...line} />
          <rect x="76" y={t - 14} width="48" height="10" fill={green ? '#1b1b1b' : '#c62828'} />
          {green ? <rect x="93" y={t - 16} width="14" height="14" rx="2" fill="none" stroke="#ffd166" stroke-width="3" /> : null}
        </g>
      );
    }
    case 'beanie':
      return (
        <g class="Pet-hat">
          <path d={`M68 ${t + 2} C68 ${t - 40} 132 ${t - 40} 132 ${t + 2} Z`} fill="#3b82f6" {...line} />
          <rect x="63" y={t - 8} width="74" height="15" rx="6" fill="#2563eb" {...line} />
          <path
            d={`M76 ${t - 6} L76 ${t + 5} M88 ${t - 6} L88 ${t + 5} M100 ${t - 6} L100 ${t + 5} M112 ${t - 6} L112 ${t + 5} M124 ${t - 6} L124 ${t + 5}`}
            stroke="#93c5fd"
            stroke-width="2.5"
          />
          <circle cx="100" cy={t - 38} r="9" fill="#fff" {...line} />
        </g>
      );
    case 'bunny':
      return (
        <g class="Pet-hat">
          <path d={`M78 ${t + 4} C66 ${t - 40} 76 ${t - 62} 86 ${t - 60} C96 ${t - 58} 96 ${t - 30} 92 ${t + 4} Z`} fill="#fff" {...line} />
          <path d={`M82 ${t - 4} C76 ${t - 34} 80 ${t - 50} 86 ${t - 50} C90 ${t - 48} 90 ${t - 28} 88 ${t - 4} Z`} fill="#f9a8c4" />
          <path d={`M108 ${t + 4} C112 ${t - 34} 124 ${t - 58} 134 ${t - 54} C142 ${t - 48} 132 ${t - 22} 120 ${t + 4} Z`} fill="#fff" {...line} />
          <path d={`M113 ${t - 4} C116 ${t - 30} 124 ${t - 46} 130 ${t - 44} C134 ${t - 40} 128 ${t - 20} 118 ${t - 4} Z`} fill="#f9a8c4" />
        </g>
      );
  }
  return null;
}

/* ------------------------------------------------------------- extras */

function extras(mood: Mood, stage: number, action: Action, species: Species): Mithril.Children {
  const out: Mithril.Children[] = [];

  if (mood === 'sleepy') {
    out.push(
      <g class="Pet-zzz">
        <text x="138" y="80" font-size="16">
          z
        </text>
        <text x="150" y="60" font-size="21">
          z
        </text>
        <text x="164" y="38" font-size="27">
          Z
        </text>
      </g>
    );
  }

  if (mood === 'happy' && !action) {
    out.push(
      <g class="Pet-hearts">
        <path class="Pet-heart" d={heart(154, 78, 9)} fill="#f47c86" stroke={INK} stroke-width="2.5" />
        <path class="Pet-heart Pet-heart--2" d={heart(44, 92, 7)} fill="#f9a8c4" stroke={INK} stroke-width="2.5" />
      </g>
    );
  }

  if (mood === 'excited' || mood === 'celebrating') {
    out.push(
      <g class="Pet-sparkles">
        <path d={star(36, 64, 9, 3)} fill="#ffd166" stroke={INK} stroke-width="2" />
        <path d={star(166, 92, 7, 2.5)} fill="#7cc7ff" stroke={INK} stroke-width="2" />
        <path d={star(160, 40, 6, 2.2)} fill="#f9a8c4" stroke={INK} stroke-width="2" />
      </g>
    );
  }

  if (mood === 'celebrating') {
    const colors = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];
    out.push(
      <g class="Pet-confetti">
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            x={14 + ((i * 53) % 172)}
            y={-10}
            width="6"
            height="10"
            rx="1.5"
            fill={colors[i % colors.length]}
            style={`animation-delay:${((i * 0.37) % 2.4).toFixed(2)}s`}
          />
        ))}
      </g>
    );
  }

  if (action === 'feed') {
    out.push(
      stage === 0 ? (
        <g class="Pet-warmth">
          <path d={heart(70, 70, 8)} fill="#f47c86" stroke={INK} stroke-width="2.5" />
          <path d={heart(132, 60, 10)} fill="#f9a8c4" stroke={INK} stroke-width="2.5" />
        </g>
      ) : (
        <g class="Pet-food" style={`--mouth:${mouthY(species, stage) - 30}px`}>
          <circle cx="100" cy="30" r="11" fill="#e8a25c" stroke={INK} stroke-width="3" />
          <circle cx="96" cy="27" r="2" fill="#7a4a24" />
          <circle cx="104" cy="33" r="2" fill="#7a4a24" />
          <circle cx="103" cy="25" r="1.6" fill="#7a4a24" />
        </g>
      )
    );
  }

  if (action === 'play') {
    out.push(
      <g class="Pet-ball">
        <circle cx="30" cy="170" r="13" fill="#7cc7ff" stroke={INK} stroke-width="3" />
        <path d="M18 166 C26 172 34 172 42 166 M30 157 C26 164 26 176 30 183" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      </g>
    );
  }

  return out;
}

/** Where the mouth is, after a baby's smaller scale. */
function mouthY(species: Species, stage: number): number {
  const y = EYES[species] + 17;
  return stage === 1 ? Math.round(184 - (184 - y) * 0.74) : y;
}

/* ------------------------------------------------------------ shapes */

function star(cx: number, cy: number, outer: number, inner: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return d + 'Z';
}

function heart(x: number, y: number, s: number): string {
  return `M${x} ${y + s * 0.9} C${x - s * 1.6} ${y - s * 0.2} ${x - s * 0.8} ${y - s * 1.3} ${x} ${y - s * 0.4} C${x + s * 0.8} ${y - s * 1.3} ${x + s * 1.6} ${y - s * 0.2} ${x} ${y + s * 0.9} Z`;
}
