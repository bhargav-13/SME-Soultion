import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronDown, X, Building2, Home, PencilLine, Package, Scale, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import toast from "react-hot-toast";
import { jobWorkApi, orderApi, partyApi, itemBlueprintApi, inventoryApi, axiosInstance } from "../services/apiService";
import { upsertOrderJobOverride } from "../utils/orderJobWorkSync";
import { FINISH_LABELS } from "../constants/finishes";

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
const FORM_LABEL_CLASS = "block text-md font-medium text-black mb-2";
const FORM_INPUT_CLASS =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400";
const READONLY_INPUT_CLASS =
  "w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 outline-none cursor-not-allowed";
const FORM_SELECT_CLASS =
  "w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-500 outline-none";

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

  const manualSizes = useMemo(() => {
    const bp = blueprints.find((b) => String(b.id) === String(manualBlueprintId));
    return bp?.sizes || [];
  }, [blueprints, manualBlueprintId]);

  // In Manual mode, selecting an item-master size fills the item context + editable 1-pc weight.
  const selectManualSize = (size, bp) => {
    setManualSizeId(String(size.id));
    setItemContext((prev) => ({
      ...prev,
      sizeId: size.id,
      itemName: bp?.itemName || "",
      category: bp?.category?.name || "",
      sizeLabel: [size.sizeInInch, size.sizeInMm ? `(${size.sizeInMm})` : null].filter(Boolean).join(" "),
      pcsWeight: size.pcsWeight ?? null,
      pcsPerBox: size.inventory?.pcsPerBox ?? null,
      boxPerCarton: size.inventory?.boxPerCarton ?? null,
    }));
    setCalc((prev) => ({ ...prev, pcsWeight: size.pcsWeight != null ? String(size.pcsWeight) : "" }));
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
  const enrichSizeContext = async (size, finish) => {
    const base = { ...applySizeContext(size), finish: finish || "" };
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
          ...(await enrichSizeContext(jw.size, jw.finish)),
          orderQtyPc: jw.qtyPc ?? null,
          orderStickerQty: jw.stickerQty ?? null,
        };
        setItemContext(editCtx);
        setCalc({
          grossKg: jw.grossKg != null ? String(jw.grossKg) : "",
          elementCount: jw.elementCount != null ? String(jw.elementCount) : "",
          elementType: jw.elementType || "PETI",
          petiWeightKg: jw.petiWeightKg != null ? String(jw.petiWeightKg) : "",
          pcsWeight: editCtx.pcsWeight != null ? String(editCtx.pcsWeight) : "",
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
          ...(await enrichSizeContext(orderItem.itemSize, orderItem.plating)),
          orderQtyPc: orderItem.qtyPc ?? null,
          orderStickerQty: orderItem.stickerQty ?? null,
        };
        setItemContext(createCtx);
        setCalc((prev) => ({
          ...prev,
          pcsWeight: createCtx.pcsWeight != null ? String(createCtx.pcsWeight) : "",
        }));
        setExistingStatus("PENDING");
      } catch (err) {
        if (!cancelled) setContextError(err?.response?.data?.message || "Failed to load order item data");
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    };

    if (manualMode) {
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
      toast.error("Missing item context — reopen this page from the order.");
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
        <div className="mx-auto max-w-2xl mt-10 bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-700">{contextError}</p>
          <button
            type="button"
            onClick={() => navigate("/order")}
            className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
          >
            Back to Orders
          </button>
        </div>
      </SidebarLayout>
    );
  }

  const ModeIcon = (JOB_MODES.find((m) => m.value === jobWorkType) || JOB_MODES[0]).icon;
  const LBL = "block text-sm font-medium text-gray-700 mb-1.5";
  const INP =
    "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 outline-none placeholder:text-gray-400";
  const RO = "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm";
  const backTo = sourceOrderRow ? "/order" : "/job-work";

  const selectedBlueprint = blueprints.find((b) => String(b.id) === String(manualBlueprintId));

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto pb-12">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">
            {mode === "edit" ? "Edit Job Work" : "New Job Work"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Weigh the shipment once, enter Peti &amp; rate — pieces, stickers, cartons and the total are worked out for you.
          </p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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
                className={`rounded-xl border p-3.5 text-left transition flex items-center gap-3 ${
                  active
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/15" : "bg-gray-100"}`}>
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-gray-600"}`} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className={`text-xs ${active ? "text-white/70" : "text-gray-400"}`}>{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT — inputs */}
            <div className="lg:col-span-2 space-y-5">
              {/* Party & Reference */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ModeIcon className="w-4 h-4 text-gray-500" />
                  <h3 className="text-base font-semibold text-gray-900">{jobWorkTypeLabel} — Party &amp; Reference</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobWorkType === "INHOUSE" ? (
                    <div>
                      <label className={LBL}>Party Name</label>
                      <input value={formData.partyName || "—"} readOnly className={RO} />
                      <p className="text-xs text-gray-400 mt-1">Auto-fetched from the order</p>
                    </div>
                  ) : (
                    <div className="relative" ref={partyRef}>
                      <label className={LBL}>{isManual ? "Party Name*" : "Job Worker name*"}</label>
                      <div
                        className={`${INP} cursor-pointer flex items-center justify-between`}
                        onClick={() => setIsPartyOpen((prev) => !prev)}
                      >
                        <span className={formData.partyName ? "text-gray-900" : "text-gray-400"}>
                          {formData.partyName || "Select party"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isPartyOpen ? "rotate-180" : ""}`} />
                      </div>
                      {isPartyOpen && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          <div className="px-3 py-2 border-b border-gray-100">
                            <input
                              type="text"
                              value={partySearch}
                              onChange={(e) => setPartySearch(e.target.value)}
                              placeholder="Search party..."
                              className={INP}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredParties.length === 0 ? (
                              <p className="px-4 py-2 text-sm text-gray-400">No parties found</p>
                            ) : (
                              filteredParties.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({ ...prev, partyName: p.name, partyId: p.id }));
                                    setIsPartyOpen(false);
                                    setPartySearch("");
                                  }}
                                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${formData.partyId === p.id ? "font-semibold bg-gray-50" : ""}`}
                                >
                                  {p.name}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
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
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <h3 className="text-base font-semibold text-gray-900">Item Details</h3>
                  </div>
                  <span className="text-xs text-gray-400">
                    {itemEditable ? "Pick from the item master" : loadingContext ? "Loading…" : "Fetched from the order"}
                  </span>
                </div>

                {itemEditable ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Item picker */}
                    <div className="relative">
                      <label className={LBL}>Item*</label>
                      <button type="button" onClick={() => setOpenManualItem((v) => !v)} className={`${INP} flex items-center justify-between`}>
                        <span className={itemContext.itemName ? "text-gray-900" : "text-gray-400"}>{itemContext.itemName || "Select item"}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openManualItem ? "rotate-180" : ""}`} />
                      </button>
                      {openManualItem && (
                        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {blueprints.length === 0 ? (
                            <p className="px-4 py-2 text-sm text-gray-400">No items</p>
                          ) : (
                            blueprints.map((bp) => (
                              <button
                                key={bp.id}
                                type="button"
                                onClick={() => {
                                  setManualBlueprintId(String(bp.id));
                                  setManualSizeId("");
                                  setItemContext((prev) => ({ ...prev, sizeId: "", itemName: bp.itemName || "", category: bp.category?.name || "", sizeLabel: "", pcsWeight: null, pcsPerBox: null, boxPerCarton: null }));
                                  setCalc((prev) => ({ ...prev, pcsWeight: "" }));
                                  setOpenManualItem(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${String(bp.id) === String(manualBlueprintId) ? "font-semibold bg-gray-50" : ""}`}
                              >
                                {bp.itemName || `Item #${bp.id}`}
                                {bp.category?.name ? <span className="text-gray-400"> · {bp.category.name}</span> : null}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {/* Size picker */}
                    <div className="relative">
                      <label className={LBL}>Size*</label>
                      <button
                        type="button"
                        disabled={!manualBlueprintId}
                        onClick={() => setOpenManualSize((v) => !v)}
                        className={`${INP} flex items-center justify-between ${!manualBlueprintId ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        <span className={itemContext.sizeLabel ? "text-gray-900" : "text-gray-400"}>{itemContext.sizeLabel || "Select size"}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openManualSize ? "rotate-180" : ""}`} />
                      </button>
                      {openManualSize && manualBlueprintId && (
                        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {manualSizes.length === 0 ? (
                            <p className="px-4 py-2 text-sm text-gray-400">No sizes</p>
                          ) : (
                            manualSizes.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => { selectManualSize(s, selectedBlueprint); setOpenManualSize(false); }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${String(s.id) === String(manualSizeId) ? "font-semibold bg-gray-50" : ""}`}
                              >
                                {[s.sizeInInch, s.sizeInMm ? `(${s.sizeInMm})` : null].filter(Boolean).join(" ")}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {/* Finish picker */}
                    <div className="relative">
                      <label className={LBL}>Finish*</label>
                      <button type="button" onClick={() => setOpenFinish((v) => !v)} className={`${INP} flex items-center justify-between`}>
                        <span className={itemContext.finish ? "text-gray-900" : "text-gray-400"}>{itemContext.finish || "Select finish"}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openFinish ? "rotate-180" : ""}`} />
                      </button>
                      {openFinish && (
                        <div className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                          {FINISH_LABELS.map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => { setItemContext((prev) => ({ ...prev, finish: f })); setOpenFinish(false); }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${itemContext.finish === f ? "font-semibold bg-gray-50" : ""}`}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      )}
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
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="w-4 h-4 text-gray-500" />
                  <h3 className="text-base font-semibold text-gray-900">Weighing, Peti &amp; Rate</h3>
                </div>
                <p className="text-xs text-gray-400 mb-4">Net Kg = Gross − Peti × tare. Total Pcs = Net ÷ 1-pc weight.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={LBL}>Gross Kg (weighed)*</label>
                    <input type="number" step="0.001" value={calc.grossKg} onChange={(e) => updateCalc({ grossKg: e.target.value })} className={INP} placeholder="150.150" />
                  </div>
                  <div>
                    <label className={LBL}>Peti Count</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="1" value={calc.elementCount} onChange={(e) => updateCalc({ elementCount: e.target.value })} className={INP} placeholder="5" />
                      <div className="relative">
                        <button type="button" onClick={() => setOpenElementType((prev) => !prev)} className={`${INP} flex items-center justify-between`}>
                          <span>{ELEMENT_TYPE_LABEL[calc.elementType]}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${openElementType ? "rotate-180" : ""}`} />
                        </button>
                        {openElementType && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white overflow-hidden shadow">
                            {ELEMENT_TYPE_OPTIONS.map((opt) => (
                              <button key={opt} type="button" onClick={() => { updateCalc({ elementType: opt }); setOpenElementType(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100">
                                {ELEMENT_TYPE_LABEL[opt]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={LBL}>1 Peti Weight (Kg)</label>
                    <input type="number" step="0.001" value={calc.petiWeightKg} onChange={(e) => updateCalc({ petiWeightKg: e.target.value })} className={INP} placeholder="1" />
                  </div>
                  <div>
                    <label className={LBL}>1 Pcs Weight (Kg)</label>
                    <input type="number" step="0.0001" value={calc.pcsWeight} onChange={(e) => updateCalc({ pcsWeight: e.target.value })} className={INP} placeholder="0.292" />
                    <p className="text-xs text-gray-400 mt-1">From item — editable</p>
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
              <div className="sticky top-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-gray-500" />
                  <h3 className="text-base font-semibold text-gray-900">Summary</h3>
                </div>
                <div className="rounded-xl bg-gray-900 text-white p-4 mb-4">
                  <p className="text-xs text-white/60">Total Rate</p>
                  <p className="text-3xl font-semibold mt-1">₹ {fmt(derived.totalRate, 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Net Kg", fmt(derived.netKg, 3)],
                    ["Total Pcs", fmt(derived.totalPcs, 0)],
                    ["Sticker Qty", fmt(derived.stickerQty, 0)],
                    ["Total Carton", fmt(derived.totalCarton, 2)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-gray-400">{k}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={saving || loadingContext}
                  className="mt-5 w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : mode === "edit" ? "Update Job Work" : "Create Job Work"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(backTo)}
                  disabled={saving}
                  className="mt-2 w-full py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
};

export default MoveToJobWork;
