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
export const ORDER_STATUS = {
  PENDING_APPROVAL: { label: "Pending Approval", className: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-800" },
  IN_PLATING: { label: "In Plating", className: "bg-indigo-100 text-indigo-800" },
  READY_TO_DISPATCH: { label: "Ready to Dispatch", className: "bg-teal-100 text-teal-800" },
  DISPATCHED: { label: "Dispatched", className: "bg-purple-100 text-purple-800" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
  // No order is *derived* as IN_PROGRESS any more, but an admin can still set a
  // request to it by hand, so it stays renderable (and off the filter tabs).
  IN_PROGRESS: { label: "In Progress", className: "bg-indigo-100 text-indigo-800" },
};

/**
 * Statuses offered as filter tabs, in pipeline order. The server keeps a request in exactly one of
 * these, so the tabs partition the list rather than overlap: an order sent for plating leaves
 * "Approved" for "In Plating", and one fully dispatched leaves "Ready to Dispatch".
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

/** Per-line stage the server reports on an order request item. */
export const ITEM_STAGE = {
  APPROVED: { label: "Not started", className: "bg-gray-100 text-gray-700" },
  IN_PLATING: { label: "In Plating", className: "bg-indigo-100 text-indigo-800" },
  READY_TO_DISPATCH: { label: "Ready to Dispatch", className: "bg-teal-100 text-teal-800" },
  DISPATCHED: { label: "Dispatched", className: "bg-purple-100 text-purple-800" },
};

// ─── Job work (per order item) ─────────────────────────────────────────────
export const JOB_WORK_STATUS = {
  PENDING: { label: "In Plating", className: "bg-amber-100 text-amber-800" },
  COMPLETE: { label: "Returned", className: "bg-green-100 text-green-800" },
  REJECT: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

/**
 * The stage a single order item sits at. Ordered least → most advanced, since
 * an order is only as far along as its least advanced item. Same names and
 * ordering as the server's OrderItemStage, so the two never disagree.
 */
export const ITEM_STAGE_RANK = {
  APPROVED: 0,
  IN_PLATING: 1,
  READY_TO_DISPATCH: 2,
  DISPATCHED: 3,
};

/**
 * Work out which stage an order item is at. Mirrors the server's
 * ClientOrderFulfillmentService so an order request and a plain ERP order read
 * the same way.
 *
 * Any return at all advances the item: on a partial return it is the returned
 * Kg that is ready to dispatch, with the rest still at the plater. The job
 * work's own status is an equally valid signal — the server flips it to
 * COMPLETE the moment a return is recorded.
 *
 * A job work rejected at the plater counts as still outstanding: the pieces are
 * not back, so the item has not advanced past plating.
 */
export const deriveItemStage = (item) => {
  const qtyPc = Number(item?.qtyPc) || 0;
  const dispatchedPc = Number(item?.dispatchedPc) || 0;
  if (qtyPc > 0 && dispatchedPc >= qtyPc) return "DISPATCHED";

  const jobWork = item?.jobWork;
  if (!jobWork) return "APPROVED";
  if (jobWork.status === "REJECT") return "IN_PLATING";
  if (jobWork.status === "COMPLETE") return "READY_TO_DISPATCH";

  return (Number(jobWork.returnedKg) || 0) > 0 ? "READY_TO_DISPATCH" : "IN_PLATING";
};

/** Kg values come back as doubles; show at most 2 decimals and drop trailing zeros. */
export const formatKg = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return String(Number(num.toFixed(2)));
};

/**
 * Derive a display status for an order coming from the existing ERP order API.
 *
 * The order takes the stage of its *least advanced* item — the bottleneck — so
 * the badge answers "what is this order still waiting on?" rather than
 * flattering it with the progress of whichever item happens to be furthest
 * along. Per-item detail is in the Job Work column of the order table.
 *
 * Returns an object: { status, dispatchedPc, totalPc }
 *  - APPROVED: order created, nothing sent for plating or dispatched yet
 *  - IN_PLATING: at least one item is still out for plating (outside/in-house)
 *  - READY_TO_DISPATCH: something is back from plating and waiting to go out
 *  - DISPATCHED: every piece ordered has gone out (includes counts)
 */
export const deriveErpOrderStatus = (order) => {
  const items = order?.items || [];
  if (items.length === 0) return { status: "APPROVED" };

  const totalPc = items.reduce((sum, it) => sum + (Number(it.qtyPc) || 0), 0);
  const dispatchedPc = items.reduce((sum, it) => sum + (Number(it.dispatchedPc) || 0), 0);
  const counts = { dispatchedPc, totalPc };

  const bottleneck = items
    .map(deriveItemStage)
    .reduce((slowest, stage) =>
      ITEM_STAGE_RANK[stage] < ITEM_STAGE_RANK[slowest] ? stage : slowest
    );

  return { status: bottleneck, ...counts };
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
