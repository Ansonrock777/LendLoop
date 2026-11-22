import { Art, F } from "./parts";

export const Drill = () => (
  <Art>
    <rect x="26" y="24" width="72" height="34" rx="15" className={F.amber} />
    <rect x="98" y="32" width="18" height="18" rx="4" className={F.blue} />
    <path d="M116 41h20" />
    <path d="M44 56h26l-3 28a7 7 0 0 1-7 6h-6a7 7 0 0 1-7-6z" className={F.sage} />
    <rect x="34" y="88" width="42" height="14" rx="6" className={F.blue} />
    <rect x="70" y="58" width="7" height="13" rx="3" className={F.ink} />
    <path d="M38 32v18M48 32v18M52 68h12M52 76h12" />
    <circle cx="84" cy="34" r="3" className={F.ink} />
  </Art>
);

export const CircularSaw = () => (
  <Art>
    <g transform="translate(0 -4)">
      <circle cx="72" cy="70" r="36" strokeDasharray="4 5" />
      <circle cx="72" cy="70" r="30" className={F.blue} />
      <circle cx="72" cy="70" r="7" className={F.ink} />
      <path d="M36 70a36 36 0 0 1 72 0z" className={F.amber} />
      <rect x="22" y="68" width="100" height="6" rx="3" className={F.ink} />
      <rect x="98" y="34" width="32" height="20" rx="10" className={F.sage} />
      <path d="M106 44h16M72 80v14M58 78l-8 12M86 78l8 12" />
    </g>
  </Art>
);

export const Sander = () => (
  <Art>
    <rect x="34" y="78" width="92" height="14" rx="7" className={F.blue} />
    <path d="M42 78c0-28 16-44 38-44s38 16 38 44z" className={F.amber} />
    <rect x="66" y="22" width="28" height="16" rx="8" className={F.sage} />
    <rect x="112" y="56" width="22" height="12" rx="5" className={F.blue} />
    <circle cx="66" cy="60" r="5" className={F.ink} />
    <path d="M56 48c6-4 12-6 24-6" />
    <circle cx="50" cy="85" r="2" className={F.ink} />
    <circle cx="70" cy="85" r="2" className={F.ink} />
    <circle cx="90" cy="85" r="2" className={F.ink} />
    <circle cx="110" cy="85" r="2" className={F.ink} />
  </Art>
);

export const Jigsaw = () => (
  <Art>
    <path d="M48 46V34a10 10 0 0 1 10-10h36a10 10 0 0 1 10 10v12z" className={F.sage} />
    <rect x="58" y="31" width="36" height="10" rx="5" className={F.tint} />
    <rect x="38" y="46" width="72" height="30" rx="12" className={F.amber} />
    <path d="M110 54h12a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-12z" className={F.blue} />
    <rect x="30" y="76" width="100" height="8" rx="4" className={F.blue} />
    <rect x="114" y="84" width="5" height="20" rx="2" className={F.tint} />
    <circle cx="58" cy="61" r="5" className={F.ink} />
    <path d="M76 54v14M86 54v14" />
  </Art>
);
