const STORAGE_KEY = "gres:records";

const readArray = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeArray = (records) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors
  }
};

export const loadGresRecords = () =>
  readArray().sort((a, b) => (Number(b.createdAt || 0) - Number(a.createdAt || 0)));

export const upsertGresRecord = (record) => {
  const records = readArray();
  const now = new Date().toISOString();
  const nextRecord = {
    ...record,
    updatedAt: now,
    createdAt: record.createdAt || now,
  };

  const index = records.findIndex((item) => String(item.id) === String(nextRecord.id));
  const nextRecords = index >= 0
    ? records.map((item, idx) => (idx === index ? nextRecord : item))
    : [nextRecord, ...records];

  writeArray(nextRecords);
  return nextRecord;
};

export const deleteGresRecord = (id) => {
  const nextRecords = readArray().filter((item) => String(item.id) !== String(id));
  writeArray(nextRecords);
  return nextRecords;
};

export const upsertGresReturn = (gresId, returnRecord) => {
  const records = readArray();
  const now = new Date().toISOString();

  const nextRecords = records.map((record) => {
    if (String(record.id) !== String(gresId)) return record;
    const returns = Array.isArray(record.returns) ? record.returns : [];
    const index = returns.findIndex((item) => String(item.id) === String(returnRecord.id));
    const nextReturns = index >= 0
      ? returns.map((item, idx) => (idx === index ? returnRecord : item))
      : [returnRecord, ...returns];
    return {
      ...record,
      returns: nextReturns,
      updatedAt: now,
    };
  });

  writeArray(nextRecords);
  return nextRecords;
};

export const deleteGresReturn = (gresId, returnId) => {
  const records = readArray();
  const now = new Date().toISOString();
  const nextRecords = records.map((record) => {
    if (String(record.id) !== String(gresId)) return record;
    return {
      ...record,
      returns: (record.returns || []).filter((item) => String(item.id) !== String(returnId)),
      updatedAt: now,
    };
  });
  writeArray(nextRecords);
  return nextRecords;
};

