import { Art, F, Tube } from "./parts";

export const PressureWasher = () => (
  <Art>
    <Tube d="M38 34v-8h38v8" color="sage" />
    <rect x="28" y="34" width="58" height="56" rx="12" className={F.amber} />
    <rect x="38" y="46" width="38" height="20" rx="5" className={F.blue} />
    <circle cx="48" cy="78" r="4" className={F.ink} />
    <path d="M60 78h16" />
    <circle cx="42" cy="96" r="9" className={F.ink} />
    <circle cx="42" cy="96" r="3" className={F.tint} />
    <circle cx="74" cy="96" r="9" className={F.ink} />
    <circle cx="74" cy="96" r="3" className={F.tint} />
    <Tube d="M86 70c14 0 6-14 20-14" color="blue" />
    <rect x="104" y="48" width="24" height="14" rx="6" className={F.sage} />
    <path d="M128 55h14M112 62l-2 9" />
  </Art>
);

export const Vacuum = () => (
  <Art>
    <g transform="translate(-6 0)">
      <Tube d="M88 70c20 0 18-34 34-34" color="sage" />
      <Tube d="M122 36l8 40" color="sage" />
      <rect x="116" y="76" width="28" height="10" rx="5" className={F.amber} />
      <rect x="24" y="56" width="64" height="36" rx="18" className={F.blue} />
      <rect x="44" y="46" width="24" height="10" rx="5" className={F.amber} />
      <circle cx="40" cy="96" r="8" className={F.ink} />
      <circle cx="74" cy="96" r="8" className={F.ink} />
      <circle cx="56" cy="74" r="5" className={F.tint} />
      <path d="M70 68h10M70 74h10" />
    </g>
  </Art>
);

export const CarpetCleaner = () => (
  <Art>
    <g transform="translate(8 0)">
      <Tube d="M82 36h22a6 6 0 0 1 6 6v36" color="amber" />
      <rect x="58" y="17" width="16" height="8" rx="4" className={F.amber} />
      <rect x="44" y="24" width="44" height="56" rx="10" className={F.blue} />
      <rect x="52" y="34" width="28" height="32" rx="6" className={F.sage} />
      <path d="M52 50q7-5 14 0t14 0" />
      <rect x="36" y="80" width="70" height="18" rx="9" className={F.amber} />
      <path d="M46 98h50" />
    </g>
  </Art>
);

export const Generic = () => (
  <Art>
    <g transform="rotate(-40 80 60)">
      <rect x="73" y="44" width="14" height="62" rx="7" className={F.amber} />
      <circle cx="80" cy="34" r="19" className={F.blue} />
      <path d="M73 12v20h14V12" className={F.tint} />
      <circle cx="80" cy="96" r="3" className={F.tint} />
    </g>
  </Art>
);
