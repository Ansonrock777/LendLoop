import { Art, F, Tube } from "./parts";

export const Toolbox = () => (
  <Art>
    <Tube d="M54 46V36a8 8 0 0 1 8-8h36a8 8 0 0 1 8 8v10" color="sage" />
    <rect x="26" y="46" width="108" height="54" rx="10" className={F.blue} />
    <path d="M26 66V56a10 10 0 0 1 10-10h88a10 10 0 0 1 10 10v10z" className={F.amber} />
    <rect x="70" y="60" width="20" height="14" rx="4" className={F.tint} />
    <circle cx="80" cy="67" r="2" className={F.ink} />
    <path d="M26 84h108" />
    <circle cx="38" cy="56" r="2" className={F.ink} />
    <circle cx="122" cy="56" r="2" className={F.ink} />
    <circle cx="38" cy="92" r="2" className={F.ink} />
    <circle cx="122" cy="92" r="2" className={F.ink} />
  </Art>
);

export const Hammer = () => (
  <Art>
    <g transform="rotate(-35 80 62)">
      <rect x="73" y="34" width="14" height="72" rx="6" className={F.amber} />
      <rect x="73" y="70" width="14" height="36" rx="6" className={F.sage} />
      <path d="M77 80h6M77 88h6M77 96h6" />
      <path d="M54 28C44 28 34 32 28 42c10 0 18 0 26 2z" className={F.blue} />
      <rect x="54" y="24" width="52" height="22" rx="6" className={F.blue} />
      <path d="M96 24v22" />
    </g>
  </Art>
);

export const SpiritLevel = () => (
  <Art>
    <rect x="20" y="42" width="120" height="36" rx="10" className={F.amber} />
    <rect x="58" y="50" width="44" height="20" rx="10" className={F.tint} />
    <ellipse cx="80" cy="60" rx="7" ry="4.5" className={F.sage} />
    <path d="M70 52v16M90 52v16" />
    <circle cx="36" cy="60" r="6" className={F.tint} />
    <circle cx="124" cy="60" r="6" className={F.tint} />
    <path d="M30 42v6M44 42v6M116 42v6M130 42v6" />
  </Art>
);

export const StepLadder = () => (
  <Art>
    <path d="M44 102l12-76h10l-10 76z" className={F.blue} />
    <path d="M116 102l-12-76h-10l10 76z" className={F.blue} />
    <rect x="53" y="44" width="54" height="9" rx="4" className={F.amber} />
    <rect x="50" y="62" width="60" height="9" rx="4" className={F.amber} />
    <rect x="47" y="80" width="66" height="9" rx="4" className={F.amber} />
    <rect x="54" y="16" width="52" height="11" rx="5" className={F.sage} />
    <path d="M64 21h32" />
  </Art>
);
