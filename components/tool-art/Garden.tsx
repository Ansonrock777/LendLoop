import { Art, F, Tube } from "./parts";

export const Lawnmower = () => (
  <Art>
    <Tube d="M90 58L114 24h16" color="amber" />
    <rect x="22" y="44" width="22" height="30" rx="7" className={F.sage} />
    <rect x="36" y="56" width="64" height="28" rx="12" className={F.amber} />
    <rect x="58" y="47" width="22" height="10" rx="4" className={F.blue} />
    <path d="M44 70h50" />
    <circle cx="48" cy="92" r="11" className={F.ink} />
    <circle cx="48" cy="92" r="4" className={F.tint} />
    <circle cx="90" cy="92" r="11" className={F.ink} />
    <circle cx="90" cy="92" r="4" className={F.tint} />
  </Art>
);

export const HedgeTrimmer = () => (
  <Art>
    <g transform="translate(0 10)">
      <rect x="62" y="56" width="70" height="14" rx="3" className={F.blue} />
      <path d="M70 70v8M80 70v8M90 70v8M100 70v8M110 70v8M120 70v8" />
      <rect x="24" y="44" width="46" height="34" rx="13" className={F.amber} />
      <Tube d="M32 44V32a6 6 0 0 1 6-6h14a6 6 0 0 1 6 6v12" color="sage" />
      <circle cx="46" cy="61" r="5" className={F.ink} />
      <path d="M58 52v18" />
    </g>
  </Art>
);

export const Wheelbarrow = () => (
  <Art>
    <Tube d="M40 50L20 72" color="amber" />
    <path d="M60 76l-6 24M48 100h14" />
    <path d="M100 66L118 84" />
    <path d="M36 44h72l-10 32H50z" className={F.blue} />
    <rect x="32" y="36" width="80" height="9" rx="4" className={F.amber} />
    <path d="M52 58h44" />
    <circle cx="118" cy="84" r="15" className={F.ink} />
    <circle cx="118" cy="84" r="5" className={F.tint} />
  </Art>
);

export const GardenHose = () => (
  <Art>
    <path d="M52 92l-8 14M88 92l8 14M38 106h64" />
    <circle cx="70" cy="58" r="34" className={F.amber} />
    <circle cx="70" cy="58" r="24" className={F.sage} />
    <circle cx="70" cy="58" r="14" className={F.amber} />
    <circle cx="70" cy="58" r="5" className={F.ink} />
    <Tube d="M98 68c12 10 18 12 28 4" color="blue" />
    <rect x="122" y="70" width="16" height="10" rx="3" className={F.sage} />
    <path d="M138 75h6" />
  </Art>
);
