import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Building2, Home, PencilLine, Package, Scale, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "@/components/SidebarLayout";
import { PageBody, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import toast from "react-hot-toast";
import { jobWorkApi, orderApi, partyApi, itemBlueprintApi, inventoryApi, clientInventoryApi, axiosInstance } from "@/services/apiService";
import { upsertOrderJobOverride } from "@/utils/orderJobWorkSync";
import { FINISH_LABELS } from "@/constants/finishes";

const JOB_MODES = [
  { value: "OUTSIDE", label: "Out-Side", hint: "Sent to a vendor", icon: Building2 },
  { value: "INHOUSE", label: "In-Side", hint: "Party from order", icon: Home },
  { value: "MANUAL", label: "Manual", hint: "Enter it yourself", icon: PencilLine },
];

const getNow = () => {
  const d = new Date();
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
};

const EMPTY_FORM = {
  partyName: "",
  partyId: "",
  chithiNo: "",
  time: "",
  date: "",
};

const EMPTY_ITEM_CONTEXT = {
  sizeId: "",
  itemName: "",
  category: "",
  sizeLabel: "",
  finish: "",
  pcsWeight: null,
  pcsPerBox: null,
  boxPerCarton: null,
  orderQtyPc: null,
  orderStickerQty: null,
};

const EMPTY_CALC = {
  grossKg: "",
  elementCount: "",
  elementType: "PETI",
  petiWeightKg: "",
  pcsWeight: "", // fetched from the item, editable per the excel ("1 pcs weight: manual - changeable")
  ratePerKg: "",
};

const ELEMENT_TYPE_OPTIONS = ["PETI", "DRUM"];
const ELEMENT_TYPE_LABEL = { PETI: "Peti", DRUM: "Drum" };
const FORM_LABEL_CLASS = "mb-2 block text-[12.5px] font-medium text-ink-2";
const FORM_INPUT_CLASS =
  "w-full rounded-lg border border-line bg-surface px-4 py-2 text-[13px] outline-none transition placeholder:text-ink-3 focus:border-primary focus:ring-2 focus:ring-primary-ring/30";
const READONLY_INPUT_CLASS =
  "w-full cursor-not-allowed rounded-lg border border-line bg-surface-2 px-4 py-2 text-[13px] text-ink-2 outline-none";
const FORM_SELECT_CLASS =
  "flex h-10 w-full items-center justify-between rounded-lg border border-line bg-surface px-3 text-[13px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-ring/30";

const round3 = (n) => Math.round(n * 1000) / 1000;
const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDateForInput = (dateValue) => {
  if (!dateValue || dateValue === "—") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    const [day, month, year] = dateValue.split("/");
    return `${year}-${month}-${day}`;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) {
    const [day, month, year] = dateValue.split("-");
    return `${year}-${month}-${day}`;
  }
  return "";
};

/**
 * Mirrors the backend's excel-based calculation so the user sees the numbers before saving.
 * Direction (client's excel): weigh the shipment (gross) → net → pieces → stickers → cartons.
 *   Net Kg     = grossKg − Peti count × 1-Peti tare
 *   Total Pcs  = Net Kg / 1-pc weight        (1-pc weight fetched from item, editable)
 *   Stickers   = Total Pcs / pcsPerBox       (one sticker per box)
 *   Cartons    = Stickers / boxPerCarton
 *   Total Rate = Net Kg × Rate/Kg
 */
const computeDerived = (calc, itemContext) => {
  const grossKg = parseNumber(calc.grossKg) ?? 0;
  const elementCount = parseNumber(calc.elementCount) ?? 0;
  const petiWeightKg = parseNumber(calc.petiWeightKg) ?? 0;
  const netKg = Math.max(0, round3(grossKg - elementCount * petiWeightKg));

  const pcsWeight = parseNumber(calc.pcsWeight); // editable, prefilled from item
  const totalPcs = pcsWeight && pcsWeight > 0 ? netKg / pcsWeight : null;

  const pcsPerBox = itemContext.pcsPerBox; // from item/client master
  const stickerQty = totalPcs != null && pcsPerBox && pcsPerBox > 0 ? totalPcs / pcsPerBox : null;

  const boxPerCarton = itemContext.boxPerCarton; // from item/client master
  const totalCarton = stickerQty != null && boxPerCarton && boxPerCarton > 0 ? stickerQty / boxPerCarton : null;

  const ratePerKg = parseNumber(calc.ratePerKg);
  const totalRate = ratePerKg != null ? netKg * ratePerKg : null;

  return { netKg, totalPcs, stickerQty, totalCarton, totalRate };
};

const fmt = (n, digits = 2) => (n == null || Number.isNaN(n) ? "—" : n.toFixed(digits));

const MoveToJobWork = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(() => ({ ...EMPTY_FORM, ...getNow() }));
  const [itemContext, setItemContext] = useState(EMPTY_ITEM_CONTEXT);
  const [calc, setCalc] = useState(EMPTY_CALC);
  const [existingStatus, setExistingStatus] = useState("PENDING");
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState("");
  const [openElementType, setOpenElementType] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyRef = useRef(null);

  // Manual mode: pick the item + size straight from the item master.
  const [blueprints, setBlueprints] = useState([]);
  const [manualBlueprintId, setManualBlueprintId] = useState("");
  const [manualSizeId, setManualSizeId] = useState("");
  // Manual mode: size ids that belong to the selected party's imported client inventory.
  // Empty set ⇒ party has no imported inventory (or none selected) ⇒ fall back to full master.
  const [clientSizeIds, setClientSizeIds] = useState(() => new Set());
  // Manual mode: sizeId(string) → the client's inventory row, so packaging (pcsPerBox /
  // boxPerCarton / pcsPerCarton) is taken from Client Management, not the stock master.
  const [clientInvBySizeId, setClientInvBySizeId] = useState(() => new Map());
  const [openManualItem, setOpenManualItem] = useState(false);
  const [openManualSize, setOpenManualSize] = useState(false);
  const [openFinish, setOpenFinish] = useState(false);

  const updateCalc = (patch) => setCalc((prev) => ({ ...prev, ...patch }));

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setIsPartyOpen(false);
        setPartySearch("");
      }
    };
    if (isPartyOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPartyOpen]);

  const mode = location.state?.mode === "edit" ? "edit" : "create";
  const sourceOrderRow = location.state?.prefillOrderRow || null;
  const editJobWorkId = location.state?.jobWorkId || null;
  const editOrderItemId = location.state?.orderItemId || null;
  const manualMode = location.state?.jobWorkMode === "MANUAL";

  const [jobWorkType, setJobWorkType] = useState(() => {
    if (manualMode) return "MANUAL";
    const raw = String(sourceOrderRow?.jobWork || "").toLowerCase().replace(/[\s-]/g, "");
    if (raw === "outside") return "OUTSIDE";
    if (raw === "inhouse") return "INHOUSE";
    return "OUTSIDE";
  });

  const isManual = jobWorkType === "MANUAL";
  // Item details are typed by the user in Manual mode; read-only (from the order) otherwise.
  const itemEditable = isManual;

  const jobWorkTypeLabel =
    jobWorkType === "INHOUSE" ? "In-Side" : isManual ? "Manual" : "Out-Side";

  // Fetch parties for dropdown
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await partyApi.getAllParties();
        const data = res.data;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setParties(list);
      } catch {
        // silent — party dropdown will just be empty
      }
    };
    fetchParties();
  }, []);

  // Fetch item-master blueprints for Manual-mode item picking.
  useEffect(() => {
    const fetchBlueprints = async () => {
      try {
        const res = await itemBlueprintApi.getAllItems();
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setBlueprints(list);
      } catch {
        // silent — manual item picker will just be empty
      }
    };
    fetchBlueprints();
  }, []);

  // Manual mode: when a party is selected, scope the item/size pickers to that party's
  // imported client inventory. If the party has no imported inventory, the set stays empty
  // and the pickers fall back to the full item master.
  useEffect(() => {
    if (!isManual || !formData.partyId) {
      setClientSizeIds(new Set());
      setClientInvBySizeId(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await clientInventoryApi.getInventoryByClient(formData.partyId);
        const items = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        if (cancelled) return;
        const ids = new Set();
        const bySize = new Map();
        for (const it of items) {
          if (it.size?.id == null) continue;
          const key = String(it.size.id);
          ids.add(key);
          bySize.set(key, it);
        }
        setClientSizeIds(ids);
        setClientInvBySizeId(bySize);
      } catch {
        if (!cancelled) {
          setClientSizeIds(new Set()); // fall back to full master
          setClientInvBySizeId(new Map());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isManual, formData.partyId]);

  const vendorParties = useMemo(
    () => parties.filter((p) => p.partyType === "VENDOR" || p.partyType === "BOTH"),
    [parties]
  );

  const selectableParties = isManual ? parties : vendorParties;

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return selectableParties;
    return selectableParties.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [selectableParties, partySearch]);

  // Items to offer in Manual mode: only those with a size in the party's imported inventory,
  // or every item when the party has none (fall back to full master).
  const manualBlueprints = useMemo(() => {
    if (clientSizeIds.size === 0) return blueprints;
    return blueprints.filter((b) =>
      (b.sizes || []).some((s) => clientSizeIds.has(String(s.id)))
    );
  }, [blueprints, clientSizeIds]);

  const manualSizes = useMemo(() => {
    const bp = blueprints.find((b) => String(b.id) === String(manualBlueprintId));
    const sizes = bp?.sizes || [];
    if (clientSizeIds.size === 0) return sizes;
    return sizes.filter((s) => clientSizeIds.has(String(s.id)));
  }, [blueprints, manualBlueprintId, clientSizeIds]);

  // Editing a Manual job work: once blueprints load, back-fill which item owns the
  // already-selected size, so the item/size dropdowns show the right selection.
  useEffect(() => {
    if (!manualMode || mode !== "edit" || manualBlueprintId || !itemContext.sizeId || blueprints.length === 0) return;
    const owner = blueprints.find((b) => (b.sizes || []).some((s) => String(s.id) === String(itemContext.sizeId)));
    if (owner) setManualBlueprintId(String(owner.id));
  }, [manualMode, mode, manualBlueprintId, itemContext.sizeId, blueprints]);

  // In Manual mode, selecting an item-master size fills the item context + editable 1-pc weight.
  // Packaging (pcs/box, box/carton) is taken from the party's Client Management row when present,
  // falling back to the stock-master inventory for parties with no client-specific override.
  const selectManualSize = (size, bp) => {
    const clientInv = clientInvBySizeId.get(String(size.id));
    setManualSizeId(String(size.id));
    setItemContext((prev) => ({
      ...prev,
      sizeId: size.id,
      itemName: bp?.itemName || "",
      category: bp?.category?.name || "",
      sizeLabel: [size.sizeInInch, size.sizeInMm ? `(${size.sizeInMm})` : null].filter(Boolean).join(" "),
      pcsWeight: size.pcsWeight ?? null,
      pcsPerBox: clientInv?.pcsPerBox ?? size.inventory?.pcsPerBox ?? null,
      boxPerCarton: clientInv?.boxPerCarton ?? size.inventory?.boxPerCarton ?? null,
    }));
    setCalc((prev) => ({ ...prev, pcsWeight: size.pcsWeight != null ? String(round3(size.pcsWeight)) : "" }));
  };

  const buildChithiNo = () => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const prefix = jobWorkType === "INHOUSE" ? "I/H" : "I/O";
    return `${prefix} JWRK/01-${mm}-${yyyy}`;
  };

  const applySizeContext = (size) => ({
    sizeId: size?.id ?? "",
    itemName: size?.itemName || "",
    category: size?.category || "",
    sizeLabel: [size?.sizeInInch, size?.sizeInMm ? `(${size.sizeInMm})` : null].filter(Boolean).join(" "),
    pcsWeight: size?.pcsWeight ?? null,
    pcsPerBox: size?.pcsPerBox ?? null,
    boxPerCarton: size?.boxPerCarton ?? null,
    orderQtyPc: null,
    orderStickerQty: null,
  });

  /**
   * Resolve item/category/pcsWeight/packaging for a size directly from the item-master
   * (blueprint + inventory) endpoints. Keeps the flow working even when the order-item's
   * embedded size only carries {id, sizeInInch, sizeInMm}. Any field the size already
   * carries wins, so an enriched backend response is left untouched.
   */
  const enrichSizeContext = async (size, finish, partyId) => {
    const base = { ...applySizeContext(size), finish: finish || "" };

    // Party-customized packing (Client Management) takes precedence over the item master, exactly
    // like the create flow (selectManualSize). Only pcsPerBox / boxPerCarton are party-specific;
    // pcsWeight/itemName stay item-master values. Done before the early-return + master fallback
    // below so the client values win and the `?? inv.*` fallbacks only fill what's still missing.
    if (partyId != null && size?.id != null) {
      try {
        const ciRes = await clientInventoryApi.getInventoryByClient(Number(partyId), Number(size.id));
        const ciList = Array.isArray(ciRes.data) ? ciRes.data : ciRes.data?.data ?? [];
        const ci = ciList[0];
        if (ci) {
          if (ci.pcsPerBox != null) base.pcsPerBox = ci.pcsPerBox;
          if (ci.boxPerCarton != null) base.boxPerCarton = ci.boxPerCarton;
        }
      } catch {
        // client inventory optional — fall back to the item master below
      }
    }

    if (base.itemName && base.pcsWeight != null && base.pcsPerBox != null) return base;

    try {
      const bpRes = await itemBlueprintApi.getAllItems();
      const blueprints = Array.isArray(bpRes.data) ? bpRes.data : bpRes.data?.data || [];
      let matchedBp = null;
      let matchedSize = null;
      for (const bp of blueprints) {
        const found = (bp.sizes || []).find(
          (s) =>
            (size?.id != null && Number(s.id) === Number(size.id)) ||
            (s.sizeInInch === size?.sizeInInch && s.sizeInMm === size?.sizeInMm)
        );
        if (found) {
          matchedBp = bp;
          matchedSize = found;
          break;
        }
      }
      if (matchedBp) {
        base.itemName = base.itemName || matchedBp.itemName || "";
        base.category = base.category || matchedBp.category?.name || "";
        base.pcsWeight = base.pcsWeight ?? matchedSize?.pcsWeight ?? null;

        if (base.pcsPerBox == null || base.boxPerCarton == null) {
          try {
            const invRes = await inventoryApi.getAllInventory(
              Number(matchedBp.id),
              undefined,
              size?.sizeInInch || matchedSize?.sizeInInch,
              size?.sizeInMm || matchedSize?.sizeInMm
            );
            const invList = invRes.data?.data || invRes.data?.content || invRes.data || [];
            const inv = Array.isArray(invList) ? invList[0] : invList;
            if (inv) {
              base.pcsPerBox = base.pcsPerBox ?? inv.pcsPerBox ?? null;
              base.boxPerCarton = base.boxPerCarton ?? inv.boxPerCarton ?? null;
            }
          } catch {
            // inventory optional — sticker/carton stay blank if unavailable
          }
        }
      }
    } catch {
      // blueprint lookup optional — fall back to whatever the size embedded
    }
    return base;
  };

  // Load item + job-work context: either an existing job work (edit) or the source order item (create)
  useEffect(() => {
    let cancelled = false;

    const loadForEdit = async () => {
      setLoadingContext(true);
      try {
        const res = await jobWorkApi.getJobWorkById(Number(editOrderItemId), Number(editJobWorkId));
        const jw = res.data;
        if (cancelled) return;
        setFormData({
          ...EMPTY_FORM,
          partyName: jw.party?.name || "",
          partyId: jw.party?.id || "",
          chithiNo: jw.chitthiNo || buildChithiNo(),
          date: normalizeDateForInput(jw.jobDate),
          time: jw.orderTime || getNow().time,
        });
        const editCtx = {
          ...(await enrichSizeContext(jw.size, jw.finish, jw.party?.id)),
          orderQtyPc: jw.qtyPc ?? null,
          orderStickerQty: jw.stickerQty ?? null,
        };
        setItemContext(editCtx);
        setCalc({
          grossKg: jw.grossKg != null ? String(jw.grossKg) : "",
          elementCount: jw.elementCount != null ? String(jw.elementCount) : "",
          elementType: jw.elementType || "PETI",
          petiWeightKg: jw.petiWeightKg != null ? String(jw.petiWeightKg) : "",
          pcsWeight: editCtx.pcsWeight != null ? String(round3(editCtx.pcsWeight)) : "",
          ratePerKg: jw.ratePerKg != null ? String(jw.ratePerKg) : "",
        });
        setExistingStatus(jw.status || "PENDING");
        if (jw.jobWorkType === "INHOUSE") setJobWorkType("INHOUSE");
        else if (jw.jobWorkType === "OUTSIDE") setJobWorkType("OUTSIDE");
      } catch (err) {
        if (!cancelled) setContextError(err?.response?.data?.message || "Failed to load job work data");
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    };

    const loadForManualEdit = async (jw) => {
      setLoadingContext(true);
      try {
        if (cancelled) return;
        setFormData({
          ...EMPTY_FORM,
          partyName: jw.party?.name || "",
          partyId: jw.party?.id || "",
          chithiNo: jw.chitthiNo || buildChithiNo(),
          date: normalizeDateForInput(jw.jobDate),
          time: jw.orderTime || getNow().time,
        });
        const editCtx = {
          ...(await enrichSizeContext(jw.size, jw.finish, jw.party?.id)),
          orderQtyPc: jw.qtyPc ?? null,
          orderStickerQty: jw.stickerQty ?? null,
        };
        if (cancelled) return;
        setItemContext(editCtx);
        if (editCtx.sizeId) setManualSizeId(String(editCtx.sizeId));
        setCalc({
          grossKg: jw.grossKg != null ? String(jw.grossKg) : "",
          elementCount: jw.elementCount != null ? String(jw.elementCount) : "",
          elementType: jw.elementType || "PETI",
          petiWeightKg: jw.petiWeightKg != null ? String(jw.petiWeightKg) : "",
          pcsWeight: editCtx.pcsWeight != null ? String(round3(editCtx.pcsWeight)) : "",
          ratePerKg: jw.ratePerKg != null ? String(jw.ratePerKg) : "",
        });
        setExistingStatus(jw.status || "PENDING");
      } catch (err) {
        if (!cancelled) setContextError(err?.response?.data?.message || "Failed to load job work data");
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    };

    const loadForCreate = async () => {
      if (!sourceOrderRow?.orderId || !sourceOrderRow?.partyId || !sourceOrderRow?.id) {
        setContextError("Missing order context — open this page from an order item.");
        return;
      }
      setLoadingContext(true);
      try {
        const res = await orderApi.getOrderById(Number(sourceOrderRow.partyId), Number(sourceOrderRow.orderId));
        const order = res.data;
        const orderItem = (order.orderItems || []).find((oi) => Number(oi.id) === Number(sourceOrderRow.id));
        if (cancelled) return;
        if (!orderItem) {
          setContextError("Could not find this item on the order.");
          return;
        }
        // In-Side job work goes back to the order's own party — auto-select it. Out-Side is a
        // separate vendor the user picks.
        const isInside = jobWorkType === "INHOUSE";
        const orderPartyName =
          sourceOrderRow.partyName && sourceOrderRow.partyName !== "—" ? sourceOrderRow.partyName : "";
        setFormData({
          ...EMPTY_FORM,
          partyName: isInside ? orderPartyName : "",
          partyId: isInside ? sourceOrderRow.partyId || "" : "",
          chithiNo: buildChithiNo(),
          date: normalizeDateForInput(sourceOrderRow.date) || getNow().date,
          time: getNow().time,
        });
        const createCtx = {
          // Packing comes from the ORDER's party (the client), not the job-work vendor — the item
          // is boxed to the client's spec regardless of who plates it.
          ...(await enrichSizeContext(orderItem.itemSize, orderItem.plating, sourceOrderRow.partyId)),
          orderQtyPc: orderItem.qtyPc ?? null,
          orderStickerQty: orderItem.stickerQty ?? null,
        };
        setItemContext(createCtx);
        setCalc((prev) => ({
          ...prev,
          pcsWeight: createCtx.pcsWeight != null ? String(round3(createCtx.pcsWeight)) : "",
        }));
        setExistingStatus("PENDING");
      } catch (err) {
        if (!cancelled) setContextError(err?.response?.data?.message || "Failed to load order item data");
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    };

    if (manualMode && mode === "edit" && location.state?.prefillJobWork) {
      loadForManualEdit(location.state.prefillJobWork);
    } else if (manualMode) {
      // Manual job work is not tied to an order — start blank, user enters everything.
      setFormData({ ...EMPTY_FORM, chithiNo: buildChithiNo(), ...getNow() });
    } else if (mode === "edit" && editJobWorkId && editOrderItemId) {
      loadForEdit();
    } else if (mode === "create") {
      loadForCreate();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, editJobWorkId, editOrderItemId, sourceOrderRow?.id, manualMode]);

  // keep chithiNo's prefix in sync with the chosen job work type while creating
  useEffect(() => {
    if (mode !== "create") return;
    setFormData((prev) => ({ ...prev, chithiNo: buildChithiNo() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobWorkType, mode]);

  const derived = useMemo(() => computeDerived(calc, itemContext), [calc, itemContext]);

  const handleChange = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  // Switch the mode pill. Leaving/entering Manual resets the item + party context so the two
  // flows never leak stale data into each other.
  const switchMode = (next) => {
    if (next === jobWorkType) return;
    setJobWorkType(next);
    if (next === "MANUAL") {
      setItemContext(EMPTY_ITEM_CONTEXT);
      setManualBlueprintId("");
      setManualSizeId("");
      setFormData((prev) => ({ ...prev, partyName: "", partyId: "" }));
      setCalc((prev) => ({ ...prev, pcsWeight: "" }));
    } else if (next === "INHOUSE" && sourceOrderRow) {
      const orderPartyName =
        sourceOrderRow.partyName && sourceOrderRow.partyName !== "—" ? sourceOrderRow.partyName : "";
      setFormData((prev) => ({ ...prev, partyName: orderPartyName, partyId: sourceOrderRow.partyId || "" }));
    } else if (next === "OUTSIDE") {
      setFormData((prev) => ({ ...prev, partyName: "", partyId: "" }));
    }
  };

  const handleSave = async () => {
    if (!formData.partyId) {
      toast.error("Please select a job worker / party");
      return;
    }
    if (!itemContext.sizeId) {
      toast.error(isManual ? "Select an item and size" : "Missing item context — reopen this page from the order.");
      return;
    }
    if (isManual && !itemContext.finish) {
      toast.error("Select a finish");
      return;
    }
    if (!calc.grossKg || parseFloat(calc.grossKg) <= 0) {
      toast.error("Enter the gross weight (Kg) that was weighed");
      return;
    }

    const orderItemId = editOrderItemId || sourceOrderRow?.id;
    const payload = {
      partyId: Number(formData.partyId),
      sizeId: Number(itemContext.sizeId),
      jobDate: formData.date || getNow().date,
      finish: itemContext.finish || undefined,
      grossKg: parseFloat(calc.grossKg),
      qtyPc: derived.totalPcs ?? undefined,
      qtyKg: derived.netKg ?? undefined,
      // Packaging resolved on the client (client-management override in Manual mode) so the
      // server's sticker/carton calc matches what the form showed.
      pcsPerBox: itemContext.pcsPerBox ?? undefined,
      boxPerCarton: itemContext.boxPerCarton ?? undefined,
      pcsWeight: calc.pcsWeight ? parseFloat(calc.pcsWeight) : undefined,
      elementCount: calc.elementCount ? parseFloat(calc.elementCount) : undefined,
      elementType: calc.elementType,
      petiWeightKg: calc.petiWeightKg ? parseFloat(calc.petiWeightKg) : undefined,
      ratePerKg: calc.ratePerKg ? parseFloat(calc.ratePerKg) : undefined,
      status: existingStatus,
      jobWorkType,
      chitthiNo: formData.chithiNo || undefined,
      chitthiDate: formData.date || undefined,
      orderTime: formData.time || undefined,
    };

    setSaving(true);
    try {
      if (isManual && mode !== "edit") {
        // Manual job work is not tied to an order item — dedicated endpoint.
        await axiosInstance.post("/api/v1/job-works/manual", payload);
        toast.success("Manual job work created!");
      } else if (isManual && mode === "edit") {
        // Manual job work has no order item to relink — dedicated update endpoint.
        await axiosInstance.put(`/api/v1/job-works/manual/${editJobWorkId}`, payload);
        toast.success("Manual job work updated!");
      } else if (mode === "edit") {
        await jobWorkApi.updateJobWork(orderItemId, editJobWorkId, payload);
        toast.success("Job work updated!");
      } else {
        await jobWorkApi.createJobWork(orderItemId, payload);
        toast.success("Job work created!");
      }

      if (orderItemId && !isManual) {
        upsertOrderJobOverride({
          orderItemId: Number(orderItemId),
          orderId: sourceOrderRow?.orderId ?? null,
          jobWork: jobWorkTypeLabel,
          platingStatus: true,
        });
      }

      navigate("/job-work", { state: sourceOrderRow ? { orderRow: sourceOrderRow } : undefined });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save job work");
    } finally {
      setSaving(false);
    }
  };

  if (contextError) {
    return (
      <SidebarLayout>
        <PageHeader title="Job work" backTo="/order" backLabel="Orders" />
        <PageBody>
          <div className="mx-auto mt-10 max-w-2xl rounded-lg border border-line bg-surface p-8 text-center">
            <p className="text-ink-2">{contextError}</p>
            <Button onClick={() => navigate("/order")} className="mt-4">
              Back to Orders
            </Button>
          </div>
        </PageBody>
      </SidebarLayout>
    );
  }

  const ModeIcon = (JOB_MODES.find((m) => m.value === jobWorkType) || JOB_MODES[0]).icon;
  const LBL = "mb-1.5 block text-[12.5px] font-medium text-ink-2";
  const INP =
    "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] outline-none transition placeholder:text-ink-3 focus:border-primary focus:ring-2 focus:ring-primary-ring/30";
  const RO = "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2";
  const backTo = sourceOrderRow ? "/order" : "/job-work";

  const selectedBlueprint = blueprints.find((b) => String(b.id) === String(manualBlueprintId));

  return (
    <SidebarLayout>
      <PageHeader
        title={mode === "edit" ? "Edit job work" : "New job work"}
        subtitle="Weigh the shipment once, enter Peti & rate — pieces, stickers, cartons and the total are worked out for you."
        backTo={backTo}
        backLabel={sourceOrderRow ? "Orders" : "Job work"}
      />

      <PageBody>
        {/* Mode selector */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {JOB_MODES.map((m) => {
            const Icon = m.icon;
            const active = jobWorkType === m.value;
            const disabled = mode === "edit";
            return (
              <button
                key={m.value}
                type="button"
                disabled={disabled}
                onClick={() => switchMode(m.value)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  active
                    ? "border-ink bg-ink text-white shadow-sm"
                    : "border-line bg-surface text-ink-2 hover:border-primary/40"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15" : "bg-surface-2"}`}>
                  <Icon className={`size-4 ${active ? "text-white" : "text-ink-3"}`} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold">{m.label}</span>
                  <span className={`text-[11.5px] ${active ? "text-white/70" : "text-ink-3"}`}>{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT — inputs */}
            <div className="lg:col-span-2 space-y-5">
              {/* Party & Reference */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ModeIcon className="size-4 text-ink-3" />
                  <h3 className="font-heading text-[15px] font-semibold text-ink">{jobWorkTypeLabel} — Party &amp; Reference</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobWorkType === "INHOUSE" ? (
                    <div>
                      <label className={LBL}>Party Name</label>
                      <input value={formData.partyName || "—"} readOnly className={RO} />
                      <p className="mt-1 text-[11.5px] text-ink-3">Auto-fetched from the order</p>
                    </div>
                  ) : (
                    <div>
                      <label className={LBL}>{isManual ? "Party Name*" : "Job Worker name*"}</label>
                      <SearchableSelect
                        ariaLabel="Party name"
                        placeholder="Select party"
                        searchPlaceholder="Search party…"
                        options={filteredParties.map((p) => ({ value: String(p.id), label: p.name }))}
                        value={formData.partyId ? String(formData.partyId) : undefined}
                        onChange={(v) => {
                          const p = filteredParties.find((x) => String(x.id) === v);
                          if (!p) return;
                          setFormData((prev) => ({ ...prev, partyName: p.name, partyId: p.id }));
                          // Party drives the Manual item/size list, so clear any prior pick.
                          if (isManual) {
                            setManualBlueprintId("");
                            setManualSizeId("");
                            setItemContext((prev) => ({ ...prev, sizeId: "", itemName: "", category: "", sizeLabel: "", pcsWeight: null, pcsPerBox: null, boxPerCarton: null }));
                            setCalc((prev) => ({ ...prev, pcsWeight: "" }));
                          }
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <label className={LBL}>Chithi No.</label>
                    <input value={formData.chithiNo} readOnly className={RO} />
                  </div>
                  <div>
                    <label className={LBL}>Chithi Date</label>
                    <input type="date" value={formData.date} onChange={(e) => handleChange("date", e.target.value)} className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>Time</label>
                    <input type="time" value={formData.time} onChange={(e) => handleChange("time", e.target.value)} className={INP} />
                  </div>
                </div>
              </div>

              {/* Item */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-ink-3" />
                    <h3 className="font-heading text-[15px] font-semibold text-ink">Item Details</h3>
                  </div>
                  <span className="text-[11.5px] text-ink-3">
                    {itemEditable ? "Pick from the item master" : loadingContext ? "Loading…" : "Fetched from the order"}
                  </span>
                </div>

                {itemEditable ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Item picker */}
                    <div>
                      <label className={LBL}>Item*</label>
                      <SearchableSelect
                        ariaLabel="Item"
                        placeholder="Select item"
                        searchPlaceholder="Search item…"
                        options={manualBlueprints.map((bp) => ({
                          value: String(bp.id),
                          label: bp.itemName || `Item #${bp.id}`,
                          description: bp.category?.name || undefined,
                        }))}
                        value={manualBlueprintId ? String(manualBlueprintId) : undefined}
                        onChange={(v) => {
                          const bp = manualBlueprints.find((x) => String(x.id) === v);
                          if (!bp) return;
                          setManualBlueprintId(String(bp.id));
                          setManualSizeId("");
                          setItemContext((prev) => ({ ...prev, sizeId: "", itemName: bp.itemName || "", category: bp.category?.name || "", sizeLabel: "", pcsWeight: null, pcsPerBox: null, boxPerCarton: null }));
                          setCalc((prev) => ({ ...prev, pcsWeight: "" }));
                        }}
                      />
                    </div>
                    {/* Size picker */}
                    <div>
                      <label className={LBL}>Size*</label>
                      <SearchableSelect
                        ariaLabel="Size"
                        placeholder="Select size"
                        searchPlaceholder="Search size…"
                        options={manualSizes.map((s) => ({
                          value: String(s.id),
                          label: [s.sizeInInch, s.sizeInMm ? `(${s.sizeInMm})` : null].filter(Boolean).join(" "),
                        }))}
                        value={manualSizeId ? String(manualSizeId) : undefined}
                        disabled={!manualBlueprintId}
                        onChange={(v) => {
                          const s = manualSizes.find((x) => String(x.id) === v);
                          if (s) selectManualSize(s, selectedBlueprint);
                        }}
                      />
                    </div>
                    {/* Finish picker */}
                    <div>
                      <label className={LBL}>Finish*</label>
                      <SearchableSelect
                        ariaLabel="Finish"
                        placeholder="Select finish"
                        searchPlaceholder="Search finish…"
                        options={FINISH_LABELS.map((f) => ({ value: f, label: f }))}
                        value={itemContext.finish || undefined}
                        onChange={(v) => setItemContext((prev) => ({ ...prev, finish: v }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ["Item", itemContext.itemName],
                      ["Category", itemContext.category],
                      ["Size", itemContext.sizeLabel],
                      ["Finish", itemContext.finish],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <label className={LBL}>{k}</label>
                        <input value={v || "—"} readOnly className={RO} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <label className={LBL}>Pcs / Box · Box / Carton</label>
                  <input value={`${itemContext.pcsPerBox ?? "—"} / ${itemContext.boxPerCarton ?? "—"}`} readOnly className={`${RO} md:max-w-xs`} />
                </div>
              </div>

              {/* Weighing */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="size-4 text-ink-3" />
                  <h3 className="font-heading text-[15px] font-semibold text-ink">Weighing, Peti &amp; Rate</h3>
                </div>
                <p className="text-[11.5px] text-ink-3 mb-4">Net Kg = Gross − Peti × tare. Total Pcs = Net ÷ 1-pc weight.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={LBL}>Gross Kg (weighed)*</label>
                    <input type="number" step="0.001" value={calc.grossKg} onChange={(e) => updateCalc({ grossKg: e.target.value })} className={INP} placeholder="150.150" />
                  </div>
                  <div>
                    <label className={LBL}>Peti Count</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="1" value={calc.elementCount} onChange={(e) => updateCalc({ elementCount: e.target.value })} className={INP} placeholder="5" />
                      <SearchableSelect
                        ariaLabel="Element type"
                        options={ELEMENT_TYPE_OPTIONS.map((opt) => ({ value: opt, label: ELEMENT_TYPE_LABEL[opt] }))}
                        value={calc.elementType}
                        onChange={(v) => updateCalc({ elementType: v })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LBL}>1 Peti Weight (Kg)</label>
                    <input type="number" step="0.001" value={calc.petiWeightKg} onChange={(e) => updateCalc({ petiWeightKg: e.target.value })} className={INP} placeholder="1" />
                  </div>
                  <div>
                    <label className={LBL}>1 Pcs Weight (Kg)</label>
                    <input type="number" step="0.0001" value={calc.pcsWeight} onChange={(e) => updateCalc({ pcsWeight: e.target.value })} className={INP} placeholder="0.292" />
                    <p className="text-[11.5px] text-ink-3 mt-1">From item — editable</p>
                  </div>
                  <div>
                    <label className={LBL}>Rate / Kg</label>
                    <input type="number" step="0.01" value={calc.ratePerKg} onChange={(e) => updateCalc({ ratePerKg: e.target.value })} className={INP} placeholder="60" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — live summary */}
            <div>
              <div className="sticky top-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="size-4 text-ink-3" />
                  <h3 className="font-heading text-[15px] font-semibold text-ink">Summary</h3>
                </div>
                <div className="mb-4 rounded-xl bg-ink p-4 text-white">
                  <p className="text-[11.5px] text-white/60">Total Rate</p>
                  <p className="mt-1 font-mono text-3xl font-semibold">₹ {fmt(derived.totalRate, 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Net Kg", fmt(derived.netKg, 3)],
                    ["Total Pcs", fmt(derived.totalPcs, 0)],
                    ["Sticker Qty", fmt(derived.stickerQty, 0)],
                    ["Total Carton", fmt(derived.totalCarton, 2)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-line-2 bg-surface-2 p-3">
                      <p className="text-[11.5px] text-ink-3">{k}</p>
                      <p className="mt-0.5 font-mono text-lg font-semibold text-ink">{v}</p>
                    </div>
                  ))}
                </div>
                <Button type="submit" disabled={saving || loadingContext} className="mt-5 w-full">
                  {saving ? "Saving…" : mode === "edit" ? "Update job work" : "Create job work"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(backTo)} disabled={saving} className="mt-2 w-full">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </PageBody>
    </SidebarLayout>
  );
};

export default MoveToJobWork;
