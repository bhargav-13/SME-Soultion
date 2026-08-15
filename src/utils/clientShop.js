// ─────────────────────────────────────────────────────────────────────────
// Client Portal "Shop" — frontend helpers
//
// The product catalog, order requests, and admin approvals are now backed by
// the real client-portal-management API (see services/apiService.js). This
// module retains:
//   - Order status display configuration (ORDER_STATUS)
//   - A helper to derive a display status for legacy ERP orders
//   - A localStorage-backed cart, since the cart itself is a frontend-only
//     concept until an order request is submitted
// ─────────────────────────────────────────────────────────────────────────

export const FINISH_OPTIONS = [
  "S.S & Sartin Lacq",
  "ANTQ",
  "Side Gold",
  "Z-Black.",
  "Gr. Black.",
  "Matt S.S",
  "Matt ANTQ",
  "PVD Rose",
  "PVD Gold",
  "PVD Black",
  "Rose Gold",
  "Clear Lacq.",
];

// ─── Order status configuration ────────────────────────────────────────────
// The statuses below name the actual stage an order sits at in the works, so
// the client sees "In Plating" / "Ready to Dispatch" rather than a catch-all
// "In Progress". See deriveErpOrderStatus for how a stage is worked out.
// `className` is a pair of design-token utilities rather than raw palette classes, so a status
// pill reads the same here as every other badge in the console.
export const ORDER_STATUS = {
  PENDING_APPROVAL: { label: "Pending Approval", className: "bg-warning-soft text-warning" },
  APPROVED: { label: "Approved", className: "bg-info-soft text-info" },
  IN_PLATING: { label: "In Plating", className: "bg-primary-soft text-primary" },
  READY_TO_DISPATCH: { label: "Ready to Dispatch", className: "bg-brass-soft text-brass" },
  DISPATCHED: { label: "Dispatched", className: "bg-info-soft text-info" },
  COMPLETED: { label: "Completed", className: "bg-success-soft text-success" },
  REJECTED: { label: "Rejected", className: "bg-danger-soft text-danger" },
  // No order is *derived* as IN_PROGRESS any more, but an admin can still set a
  // request to it by hand, so it stays renderable (and off the filter tabs).
  IN_PROGRESS: { label: "In Progress", className: "bg-primary-soft text-primary" },
};

/**
 * Statuses offered as filter tabs, in pipeline order.
 *
 * PENDING_APPROVAL and REJECTED are whole-request states — a request is either awaiting a decision
 * or it isn't. The four in between are NOT: they are quantity buckets (see STAGE_BUCKETS), and one
 * order normally has quantity in several of them at once, so it shows under several tabs.
 *
 * COMPLETED and IN_PROGRESS are omitted — nothing derives them any more, so their tabs would
 * always be empty. They stay in ORDER_STATUS so legacy rows still render a sensible badge.
 */
export const ORDER_STATUS_TABS = [
  "PENDING_APPROVAL",
  "APPROVED",
  "IN_PLATING",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "REJECTED",
];

// ─── Stage quantity buckets ────────────────────────────────────────────────
/**
 * The stages are buckets of QUANTITY, not of orders. A line of 100 Kg with 50 Kg sent to the plater
 * of which 30 Kg is back reads:
 *
 *   approved 50 · in plating 20 · ready to dispatch 30 · dispatched 0
 *
 * so that one line appears under three different tabs, each showing only its own share. `field` is
 * the key inside an item's `stages` object as the server sends it.
 */
export const STAGE_BUCKETS = [
  { key: "APPROVED", field: "approved" },
  { key: "IN_PLATING", field: "inPlating" },
  { key: "READY_TO_DISPATCH", field: "readyToDispatch" },
  { key: "DISPATCHED", field: "dispatched" },
];

/** The `stages` field name for a tab key, or null for the whole-request tabs. */
export const stageFieldFor = (tabKey) =>
  STAGE_BUCKETS.find((bucket) => bucket.key === tabKey)?.field ?? null;

/** Weights are carried to 3 decimals; anything under half a gram is nothing. */
const QTY_EPSILON = 0.0005;

/** The {kg, pc} sitting at one stage of a line, or null when the line has no stage data yet. */
export const stageQty = (item, field) => item?.stages?.[field] ?? null;

/** Does this line actually have something at this stage? Drives which rows a tab shows. */
export const hasQtyAt = (item, field) => {
  const qty = stageQty(item, field);
  if (!qty) return false;
  return Math.abs(Number(qty.kg) || 0) > QTY_EPSILON || Math.abs(Number(qty.pc) || 0) > QTY_EPSILON;
};

/** Sums one stage across an order's lines, so a card can show its own total for that tab. */
export const sumStage = (items, field) =>
  (items || []).reduce(
    (total, item) => {
      const qty = stageQty(item, field);
      return {
        kg: total.kg + (Number(qty?.kg) || 0),
        pc: total.pc + (Number(qty?.pc) || 0),
      };
    },
    { kg: 0, pc: 0 }
  );

/**
 * Renders a {kg, pc} as "54.600 Kg" with the piece count alongside when known. Kg leads because
 * that is the unit the plater actually works in; pc is absent whenever the size has no 1-pc weight
 * on the item master, and is then simply left off rather than guessed.
 */
export const formatStageQty = (qty) => {
  const kg = Number(qty?.kg);
  const pc = Number(qty?.pc);
  if (!Number.isFinite(kg)) {
    return Number.isFinite(pc) ? `${Math.round(pc)} pc` : "-";
  }
  const kgText = `${kg.toFixed(3)} Kg`;
  return Number.isFinite(pc) && pc > 0 ? `${kgText} (${Math.round(pc)} pc)` : kgText;
};

/** Per-line stage the server reports on an order request item. */
export const ITEM_STAGE = {
  APPROVED: { label: "Not started", className: "bg-surface-2 text-ink-3" },
  IN_PLATING: { label: "In Plating", className: "bg-primary-soft text-primary" },
  READY_TO_DISPATCH: { label: "Ready to Dispatch", className: "bg-brass-soft text-brass" },
  DISPATCHED: { label: "Dispatched", className: "bg-info-soft text-info" },
};

/** Kg values come back as doubles; show at most 2 decimals and drop trailing zeros. */
export const formatKg = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return String(Number(num.toFixed(2)));
};

// ─── localStorage-backed cart ──────────────────────────────────────────────
const cartKey = (username) => `clientShop:cart:${username || "anon"}`;

export const getCart = (username) => {
  try {
    const raw = localStorage.getItem(cartKey(username));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCart = (username, cart) => {
  try {
    localStorage.setItem(cartKey(username), JSON.stringify(cart));
  } catch {
    // ignore storage write failures
  }
};

export const addToCart = (username, item) => {
  const cart = getCart(username);
  cart.push({ ...item, cartId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
  saveCart(username, cart);
  return cart;
};

export const removeFromCart = (username, cartId) => {
  const cart = getCart(username).filter((i) => i.cartId !== cartId);
  saveCart(username, cart);
  return cart;
};

export const clearCart = (username) => {
  saveCart(username, []);
};
