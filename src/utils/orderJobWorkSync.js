const ORDER_JOB_OVERRIDES_KEY = "orderJobWorkOverrides";

const readJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const readOrderJobOverrides = () => {
  if (typeof localStorage === "undefined") return {};
  return readJson(localStorage.getItem(ORDER_JOB_OVERRIDES_KEY));
};

export const getOrderJobOverrideKey = ({ orderItemId, orderId }) => {
  if (orderItemId !== undefined && orderItemId !== null && orderItemId !== "") {
    return `item-${orderItemId}`;
  }
  if (orderId !== undefined && orderId !== null && orderId !== "") {
    return `order-${orderId}`;
  }
  return null;
};

export const normalizeJobWorkLabel = (value) => {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");
  if (!raw || raw === "—" || raw === "-" || raw === "null" || raw === "undefined") return "—";
  if (raw === "outside") return "Outside";
  if (raw === "inhouse") return "In-House";
  if (raw === "jobwork") return "Job Work";
  return String(value);
};

export const upsertOrderJobOverride = ({ orderItemId, orderId, ...patch }) => {
  if (typeof localStorage === "undefined") return {};
  const key = getOrderJobOverrideKey({ orderItemId, orderId });
  if (!key) return readOrderJobOverrides();

  const existing = readOrderJobOverrides();
  const next = {
    ...existing,
    [key]: {
      ...(existing[key] || {}),
      ...patch,
    },
  };

  localStorage.setItem(ORDER_JOB_OVERRIDES_KEY, JSON.stringify(next));
  return next;
};

export const removeOrderJobOverride = ({ orderItemId, orderId }) => {
  if (typeof localStorage === "undefined") return {};
  const key = getOrderJobOverrideKey({ orderItemId, orderId });
  if (!key) return readOrderJobOverrides();

  const next = readOrderJobOverrides();
  delete next[key];
  localStorage.setItem(ORDER_JOB_OVERRIDES_KEY, JSON.stringify(next));
  return next;
};
