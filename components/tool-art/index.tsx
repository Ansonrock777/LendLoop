/**
 * Hand-drawn tool illustrations from the Claude Design output (Phase 3, D15), restored in D18.
 * Flat fills from the --art-* tokens with a 2px --art-line outline, so they follow light/dark.
 * Decorative only: the tool name and category are always real text next to them.
 *
 * The art kind is derived in the browser from the tool name (D15), so the public payload
 * stays exactly { id, name, category }. Unknown names fall back to the category drawing.
 */
import type { JSX } from "react";
import type { Category } from "@/convex/lib/domain";
import { cn } from "@/lib/utils";
import { CampingStove, CoolBox, SleepingBag, Tent } from "./Camping";
import { CarpetCleaner, Generic, PressureWasher, Vacuum } from "./CleaningOther";
import { GardenHose, HedgeTrimmer, Lawnmower, Wheelbarrow } from "./Garden";
import { Hammer, SpiritLevel, StepLadder, Toolbox } from "./HandTools";
import { Blender, Dehydrator, SlowCooker, StandMixer } from "./Kitchen";
import { CircularSaw, Drill, Jigsaw, Sander } from "./PowerTools";

const ART = {
  drill: Drill,
  "circular-saw": CircularSaw,
  sander: Sander,
  jigsaw: Jigsaw,
  toolbox: Toolbox,
  hammer: Hammer,
  "spirit-level": SpiritLevel,
  "step-ladder": StepLadder,
  lawnmower: Lawnmower,
  "hedge-trimmer": HedgeTrimmer,
  wheelbarrow: Wheelbarrow,
  "garden-hose": GardenHose,
  "stand-mixer": StandMixer,
  blender: Blender,
  "slow-cooker": SlowCooker,
  dehydrator: Dehydrator,
  tent: Tent,
  "camping-stove": CampingStove,
  "cool-box": CoolBox,
  "sleeping-bag": SleepingBag,
  "pressure-washer": PressureWasher,
  vacuum: Vacuum,
  "carpet-cleaner": CarpetCleaner,
  generic: Generic,
} satisfies Record<string, () => JSX.Element>;

export type ToolArtKind = keyof typeof ART;

const CATEGORY_FALLBACK: Record<Category, ToolArtKind> = {
  power_tools: "drill",
  hand_tools: "toolbox",
  garden: "wheelbarrow",
  kitchen: "blender",
  camping: "tent",
  cleaning: "vacuum",
  other: "generic",
};

/** Keyword -> drawing. First match wins, so more specific words come first. */
const KEYWORDS: [RegExp, ToolArtKind][] = [
  [/circular|mitre|miter|table saw/i, "circular-saw"],
  [/jigsaw|jig saw/i, "jigsaw"],
  [/sander|sanding/i, "sander"],
  [/drill|driver|heat gun/i, "drill"],
  [/hammer|mallet/i, "hammer"],
  [/level/i, "spirit-level"],
  [/ladder|step/i, "step-ladder"],
  [/toolbox|socket|spanner|wrench|screwdriver/i, "toolbox"],
  [/mower/i, "lawnmower"],
  [/hedge|trimmer|strimmer|blower/i, "hedge-trimmer"],
  [/barrow/i, "wheelbarrow"],
  [/hose|sprinkler|reel/i, "garden-hose"],
  [/mixer/i, "stand-mixer"],
  [/blender/i, "blender"],
  [/slow cooker|cooker|pot\b/i, "slow-cooker"],
  [/dehydrator/i, "dehydrator"],
  [/tent|gazebo/i, "tent"],
  [/stove/i, "camping-stove"],
  [/cool ?box|cooler/i, "cool-box"],
  [/sleeping/i, "sleeping-bag"],
  [/pressure|jet wash/i, "pressure-washer"],
  [/carpet|steam/i, "carpet-cleaner"],
  [/vacuum|hoover/i, "vacuum"],
];

export function artKindFor(name: string, category: Category): ToolArtKind {
  for (const [re, kind] of KEYWORDS) if (re.test(name)) return kind;
  return CATEGORY_FALLBACK[category];
}

/**
 * The drawing on its paper tile. `frame="tile"` draws the rounded tint background;
 * `frame="none"` is for places that already provide a surface.
 */
export function ToolArt({
  name,
  category,
  className,
  frame = "tile",
}: {
  name: string;
  category: Category;
  className?: string;
  frame?: "tile" | "none";
}) {
  const Drawing = ART[artKindFor(name, category)];
  return (
    <div aria-hidden className={cn("aspect-[4/3] shrink-0", frame === "tile" && "rounded-lg bg-tint p-3", className)}>
      <Drawing />
    </div>
  );
}
