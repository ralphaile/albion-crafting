import type { Market } from "./markets.types.js";

export const markets: readonly Market[] = [
  { id: "Bridgewatch", name: "Bridgewatch" },
  { id: "Brecilien", name: "Brecilien" },
  { id: "Caerleon", name: "Caerleon" },
  { id: "Fort Sterling", name: "Fort Sterling" },
  { id: "Lymhurst", name: "Lymhurst" },
  { id: "Martlock", name: "Martlock" },
  { id: "Thetford", name: "Thetford" },
  { id: "Black Market", name: "Black Market", sellOnly: true },
  {
    id: "Arthurs Rest Smugglers Network",
    name: "Arthur's Rest",
    sparseData: true,
  },
  {
    id: "Merlyns Rest Smugglers Network",
    name: "Merlyn's Rest",
    sparseData: true,
  },
  {
    id: "Morganas Rest Smugglers Network",
    name: "Morgana's Rest",
    sparseData: true,
  },
];
