import { Art, F, Tube } from "./parts";

export const Tent = () => (
  <Art>
    <path d="M80 22V10h12l-4 5 4 5H80" className={F.sage} />
    <path d="M22 100L80 22l58 78z" className={F.blue} />
    <path d="M80 54L62 100h36z" className={F.amber} />
    <path d="M80 54v46M14 100h132M30 100l-4 6M130 100l4 6" />
  </Art>
);

export const CampingStove = () => (
  <Art>
    <rect x="30" y="70" width="100" height="28" rx="10" className={F.blue} />
    <rect x="52" y="34" width="56" height="32" rx="8" className={F.sage} />
    <path d="M52 44h56" />
    <rect x="74" y="28" width="12" height="6" rx="3" className={F.ink} />
    <rect x="44" y="44" width="8" height="8" rx="3" className={F.amber} />
    <rect x="108" y="44" width="8" height="8" rx="3" className={F.amber} />
    <circle cx="50" cy="84" r="6" className={F.ink} />
    <circle cx="68" cy="84" r="6" className={F.tint} />
    <rect x="96" y="78" width="24" height="12" rx="4" className={F.amber} />
  </Art>
);

export const CoolBox = () => (
  <Art>
    <Tube d="M60 34v-4a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v4" color="sage" />
    <rect x="28" y="46" width="104" height="54" rx="10" className={F.blue} />
    <rect x="24" y="34" width="112" height="16" rx="8" className={F.amber} />
    <rect x="72" y="46" width="16" height="10" rx="3" className={F.tint} />
    <rect x="18" y="62" width="12" height="14" rx="5" className={F.sage} />
    <rect x="130" y="62" width="12" height="14" rx="5" className={F.sage} />
    <path d="M30 82h100" />
  </Art>
);

export const SleepingBag = () => (
  <Art>
    <rect x="32" y="40" width="96" height="48" rx="24" className={F.sage} />
    <circle cx="52" cy="64" r="15" className={F.blue} />
    <circle cx="52" cy="64" r="6" className={F.amber} />
    <rect x="78" y="36" width="10" height="56" rx="3" className={F.amber} />
    <rect x="100" y="36" width="10" height="56" rx="3" className={F.amber} />
    <path d="M118 56v16" />
  </Art>
);
