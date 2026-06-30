import { axiosInstance } from "./apiService";

// The 12 derived finishes (S.S. is the input, not a derived finish).
export const FINISH_META = [
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

// Hardcoded fallback (matches the seeded global defaults) used only if the API is unreachable.
const FALLBACK = {
  antiq: { multiplier: 1, offset: 10 },
  sidegold: { multiplier: 1, offset: 12 },
  sartinlacq: { multiplier: 1, offset: 0 },
  zblack: { multiplier: 1, offset: 105 },
  grblack: { multiplier: 1, offset: 60 },
  mattss: { multiplier: 1, offset: 30 },
  mattantiq: { multiplier: 1, offset: 60 },
  pvdrose: { multiplier: 1, offset: 400 },
  pvdgold: { multiplier: 1, offset: 400 },
  pvdblack: { multiplier: 1, offset: 400 },
  rosegold: { multiplier: 1, offset: 400 },
  clearlacq: { multiplier: 1, offset: 400 },
};

export const fallbackRules = () => ({ ...FALLBACK });

// Resolve formulas for a scope → { finishKey: { multiplier, offset } }. clientId null = global.
export const resolvePricingRules = async (clientId, itemId) => {
  try {
    const params = {};
    if (clientId != null) params.clientId = clientId;
    if (itemId != null) params.itemId = itemId;
    const res = await axiosInstance.get("/api/v1/pricing-rules/resolve", { params });
    const map = {};
    (res.data || []).forEach((r) => {
      map[r.finishKey] = { multiplier: r.multiplier, offset: r.offset };
    });
    // Fill any missing finishes from the fallback so callers always get all 12.
    return { ...FALLBACK, ...map };
  } catch {
    return { ...FALLBACK };
  }
};

// Upsert one finish formula at a scope.
export const upsertPricingRule = (clientId, itemId, finishKey, multiplier, offset) =>
  axiosInstance.put("/api/v1/pricing-rules", { clientId, itemId, finishKey, multiplier, offset });

// Compute a finish value from S.S. using a resolved rule set.
export const applyFinish = (ss, rule) => {
  if (!rule) return null;
  const v = ss * (rule.multiplier ?? 1) + (rule.offset ?? 0);
  return Math.round(v * 1000) / 1000;
};
