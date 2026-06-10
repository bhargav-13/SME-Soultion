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
export const ORDER_STATUS = {
  PENDING_APPROVAL: { label: "Pending Approval", className: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Approved", className: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "In Progress", className: "bg-indigo-100 text-indigo-800" },
  DISPATCHED: { label: "Dispatched", className: "bg-purple-100 text-purple-800" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

/**
 * Derive a display status for an order coming from the existing ERP order API.
 *
 * Returns an object: { status, dispatchedPc?, totalPc? }
 *  - APPROVED: order created, no job work / dispatch activity yet
 *  - IN_PROGRESS: at least one item is currently with job work (outside/in-house)
 *  - DISPATCHED: some pieces have been dispatched, but not all (includes counts)
 *  - COMPLETED: all pieces have been dispatched
 */
export const deriveErpOrderStatus = (order) => {
  const items = order?.items || [];
  if (items.length === 0) return { status: "APPROVED" };

  const totalQty = items.reduce((sum, it) => sum + (Number(it.qtyPc) || 0), 0);
  const totalDispatched = items.reduce((sum, it) => sum + (Number(it.dispatchedPc) || 0), 0);
  const anyJobInProgress = items.some((it) => it.jobActionDone);

  if (totalDispatched > 0) {
    if (totalQty > 0 && totalDispatched >= totalQty) {
      return { status: "COMPLETED" };
    }
    return { status: "DISPATCHED", dispatchedPc: totalDispatched, totalPc: totalQty };
  }

  if (anyJobInProgress) {
    return { status: "IN_PROGRESS" };
  }

  return { status: "APPROVED" };
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
