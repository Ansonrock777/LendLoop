import { Art, F } from "./parts";

export const StandMixer = () => (
  <Art>
    <g transform="translate(10 0)">
      <rect x="32" y="88" width="76" height="14" rx="6" className={F.blue} />
      <path d="M34 88V52a24 24 0 0 1 24-24h34a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H62v36z" className={F.amber} />
      <path d="M52 68h44c0 16-8 22-22 22s-22-6-22-22z" className={F.sage} />
      <circle cx="48" cy="44" r="4" className={F.ink} />
      <path d="M64 38h28M74 64v6" />
    </g>
  </Art>
);

export const Blender = () => (
  <Art>
    <path d="M94 32h10a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H92" strokeWidth={2} />
    <path d="M52 22h44l-6 54H58z" className={F.blue} />
    <rect x="50" y="14" width="48" height="9" rx="4" className={F.amber} />
    <rect x="44" y="76" width="60" height="26" rx="9" className={F.sage} />
    <circle cx="74" cy="89" r="5" className={F.ink} />
    <path d="M60 40h10M60 52h10M60 64h10" />
  </Art>
);

export const SlowCooker = () => (
  <Art>
    <rect x="22" y="60" width="12" height="8" rx="4" className={F.amber} />
    <rect x="126" y="60" width="12" height="8" rx="4" className={F.amber} />
    <path d="M32 58h96v8c0 18-12 32-30 32H62C44 98 32 84 32 66z" className={F.blue} />
    <path d="M38 58c0-16 18-26 42-26s42 10 42 26z" className={F.amber} />
    <rect x="74" y="24" width="12" height="8" rx="4" className={F.sage} />
    <circle cx="80" cy="82" r="6" className={F.tint} />
    <path d="M80 82v-4" />
  </Art>
);

export const Dehydrator = () => (
  <Art>
    <rect x="38" y="22" width="84" height="80" rx="12" className={F.amber} />
    <rect x="48" y="32" width="64" height="48" rx="6" className={F.sage} />
    <path d="M48 44h64M48 56h64M48 68h64" />
    <circle cx="62" cy="92" r="5" className={F.ink} />
    <path d="M82 92h28" />
  </Art>
);
