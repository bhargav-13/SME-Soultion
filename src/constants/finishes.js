// ─── Canonical finish list ────────────────────────────────────────────────
// Single source of truth for finishes across the app. Labels match the Stock
// Master (item master) finish price columns exactly, so the finish chosen on an
// order maps cleanly to its price column and flows unchanged into Job Work.
// `key` is the item-master/inventory price-column key for that finish.
export const FINISHES = [
  { key: "ss",         label: "S.S." },
  { key: "antiq",      label: "Antq." },
  { key: "sidegold",   label: "Side Gold" },
  { key: "sartinlacq", label: "Sartin Lacqur" },
  { key: "zblack",     label: "Z Black" },
  { key: "grblack",    label: "Gr. Black" },
  { key: "mattss",     label: "Matt S.S." },
  { key: "mattantiq",  label: "Matt Antq." },
  { key: "pvdrose",    label: "PVD Rose Gold" },
  { key: "pvdgold",    label: "PVD Gold" },
  { key: "pvdblack",   label: "PVD Black" },
  { key: "rosegold",   label: "Rose Gold" },
  { key: "clearlacq",  label: "Clear Lacqur" },
];

export const FINISH_LABELS = FINISHES.map((f) => f.label);
export const FINISH_KEY_BY_LABEL = Object.fromEntries(FINISHES.map((f) => [f.label, f.key]));
export const FINISH_LABEL_BY_KEY = Object.fromEntries(FINISHES.map((f) => [f.key, f.label]));
