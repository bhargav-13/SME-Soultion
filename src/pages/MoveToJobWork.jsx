import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import toast from "react-hot-toast";
import { jobWorkApi, partyApi } from "../services/apiService";
import { upsertOrderJobOverride } from "../utils/orderJobWorkSync";

const EMPTY_FORM = {
  partyName: "",
  partyId: "",
  chithiNo: "",
  time: "",
  date: "",
  sizeId: "",
  stickerQty: "",
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

const normalizeDateForCard = (dateValue) => {
  if (!dateValue) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateValue)) return dateValue;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-");
    return `${day}-${month}-${year}`;
  }
  return dateValue;
};

const extractElementParts = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { element: "", elementType: "Peti" };
  if (/[pP]$/.test(raw))
    return { element: raw.slice(0, -1), elementType: "Peti" };
  return { element: raw, elementType: "Wooden Peti" };
};

const ELEMENT_TYPE_OPTIONS = ["Peti", "Wooden Peti", "Bag", "Heavy Peti"];
const FORM_LABEL_CLASS = "block text-md font-medium text-black mb-2";
const FORM_INPUT_CLASS =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-sm placeholder:text-gray-400";
const FORM_SELECT_CLASS =
  "w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-500 outline-none";

const createItemRow = (seed = {}) => ({
  itemName: "",
  size: "",
  qtyPc: "",
  qtyKg: "",
  unitType: "Kgs",
  finish: "",
  element: "",
  elementType: "Peti",
  elementWeightGm: "900",
  processEmery: false,
  processSartin: false,
  ratePerKg: "",
  totalAmount: "",
  ...seed,
});

const MoveToJobWork = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [items, setItems] = useState([createItemRow()]);
  const [openElementTypeIndex, setOpenElementTypeIndex] = useState(null);
  const [openUnitTypeIndex, setOpenUnitTypeIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyRef = useRef(null);
  const addItem = () => setItems((prev) => [...prev, createItemRow()]);
  const removeItem = (idx) => setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  const updateItem = (idx, patch) =>
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

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
  const editJob = location.state?.job || null;
  const sourceOrderRow = location.state?.prefillOrderRow || null;
  // jobWorkId / orderItemId passed from new JobWork.jsx edit flow
  const editJobWorkId  = location.state?.jobWorkId   || null;
  const editOrderItemId = location.state?.orderItemId || null;

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

  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(p => (p.name || "").toLowerCase().includes(q));
  }, [parties, partySearch]);

  const inHouseStatus = useMemo(() => {
    if (mode === "edit") return editJob?.inHouseStatus || "In-House";
    const raw = String(sourceOrderRow?.jobWork || "")
      .toLowerCase()
      .replace(/[\s-]/g, "");
    if (raw === "outside") return "Outside";
    if (raw === "inhouse") return "In-House";
    return "Job Work";
  }, [mode, editJob, sourceOrderRow]);

  // Fetch job work data from API when editing by ID
  useEffect(() => {
    const buildChithiNo = () => {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      const prefix = inHouseStatus === "Outside" ? "I/O" : "I/H";
      return `${prefix} JWRK/01-${mm}-${yyyy}`;
    };

    if (mode === "edit" && editJobWorkId && editOrderItemId && !editJob) {
      const fetchJobWork = async () => {
        try {
          const res = await jobWorkApi.getJobWorkById(Number(editOrderItemId), Number(editJobWorkId));
          const jw = res.data;
          const sizeLabel = [
            jw.size?.sizeInInch,
            jw.size?.sizeInMm ? `(${jw.size.sizeInMm})` : null,
          ].filter(Boolean).join(" ");
          const typeLabel = jw.elementType === "DRUM" ? "Wooden Peti" : "Peti";
          setFormData({
            ...EMPTY_FORM,
            partyName: jw.party?.name || "",
            partyId: jw.party?.id || "",
            chithiNo: buildChithiNo(),
            date: normalizeDateForInput(jw.jobDate),
            sizeId: jw.size?.id || "",
            stickerQty: jw.stickerQty != null ? String(jw.stickerQty) : "",
          });
          setItems([
            createItemRow({
              size: sizeLabel || "",
              qtyPc: jw.qtyPc != null ? String(jw.qtyPc) : "",
              qtyKg: jw.qtyKg != null ? String(jw.qtyKg) : "",
              finish: jw.finish || "",
              element: jw.elementCount != null ? String(jw.elementCount) : "",
              elementType: typeLabel,
              elementWeightGm: typeLabel === "Peti" ? "900" : "",
            }),
          ]);
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to load job work data");
        }
      };
      fetchJobWork();
      return;
    }

    if (mode === "edit" && editJob) {
      const elementParts = extractElementParts(editJob.itemElementInput || editJob.itemElement);
      const normalizedType = ELEMENT_TYPE_OPTIONS.includes(editJob.elementType)
        ? editJob.elementType
        : elementParts.elementType;
      setFormData({
        ...EMPTY_FORM,
        partyName: editJob.partyName || "",
        chithiNo: buildChithiNo(),
        date: normalizeDateForInput(editJob.date),
        stickerQty: editJob.stickerQty || "",
      });
      setItems([
        createItemRow({
          size: editJob.itemSize || "",
          qtyPc: editJob.qtyPcInput || "",
          qtyKg:
            editJob.qtyKgInput ||
            String(editJob.itemKg || "")
              .replace(/kg/i, "")
              .trim(),
          finish: editJob.finish || "",
          element: editJob.itemElementInput || elementParts.element,
          elementType: normalizedType,
          elementWeightGm: normalizedType === "Peti" ? "900" : "",
        }),
      ]);
      return;
    }

    if (sourceOrderRow) {
      setFormData({
        ...EMPTY_FORM,
        partyName: sourceOrderRow.partyName || "",
        partyId: sourceOrderRow.partyId || "",
        chithiNo: buildChithiNo(),
        date: normalizeDateForInput(sourceOrderRow.date),
        sizeId: sourceOrderRow.sizeId || "",
        stickerQty: sourceOrderRow.stickerQty === "—" ? "" : String(sourceOrderRow.stickerQty ?? ""),
      });
      setItems([
        createItemRow({
          size: sourceOrderRow.size || "",
          qtyPc: sourceOrderRow.qtyPc === "—" ? "" : String(sourceOrderRow.qtyPc ?? ""),
          qtyKg:
            sourceOrderRow.qtyKg === "—"
              ? ""
              : String(sourceOrderRow.qtyKg ?? "")
                  .replace(/kg/i, "")
                  .trim(),
          finish: sourceOrderRow.plating || "",
          element: "",
          elementType: "Peti",
          elementWeightGm: "900",
        }),
      ]);
      return;
    }

    setFormData((prev) => ({ ...EMPTY_FORM, chithiNo: prev.chithiNo || buildChithiNo() }));
    setItems([createItemRow()]);
  }, [mode, editJob, sourceOrderRow, editJobWorkId, editOrderItemId, inHouseStatus]);
  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const primaryItem = items[0] || createItemRow();
    const qtyKgRaw = String(primaryItem.qtyKg || "").trim();
    const qtyKgLabel = qtyKgRaw ? `${qtyKgRaw}Kg` : "—";
    const normalizedDate = normalizeDateForCard(formData.date);
    const elementText =
      primaryItem.element && primaryItem.elementType
        ? `${primaryItem.element}${primaryItem.elementType === "Peti" ? "P" : ""}`
        : "—";

    // Try to save via API if we have the required IDs
    const orderItemId = sourceOrderRow?.id || editOrderItemId || editJob?.sourceItemId;
    const partyId = formData.partyId || sourceOrderRow?.partyId;
    if (!partyId) { toast.error("Please select a party"); return; }
    const sizeId = formData.sizeId || sourceOrderRow?.sizeId;
    const orderId = sourceOrderRow?.orderId || editJob?.sourceOrderId || null;
    const syncOrderRow = () => {
      if (!orderItemId) return;
      const overridePatch = {
        jobWork: inHouseStatus,
        platingStatus: true,
      };
      if (sourceOrderRow?.jobWorkNo !== undefined && sourceOrderRow?.jobWorkNo !== "—") {
        overridePatch.jobWorkNo = sourceOrderRow.jobWorkNo;
      }
      upsertOrderJobOverride({
        orderItemId: Number(orderItemId),
        orderId,
        ...overridePatch,
      });
    };

    if (orderItemId && partyId && sizeId) {
      setSaving(true);
      try {
        const jobWorkPayload = {
          partyId: Number(partyId),
          sizeId: Number(sizeId),
          jobDate: formData.date || new Date().toISOString().slice(0, 10),
          qtyPc: parseFloat(primaryItem.qtyPc) || 0,
          qtyKg: qtyKgRaw ? parseFloat(qtyKgRaw) : undefined,
          finish: primaryItem.finish || undefined,
          elementCount: primaryItem.element ? parseFloat(primaryItem.element) : undefined,
          elementType: primaryItem.elementType === "Peti" ? "PETI" : "DRUM",
          stickerQty: formData.stickerQty ? parseFloat(formData.stickerQty) : undefined,
          status: "PENDING",
          jobWorkType: inHouseStatus === "Outside" ? "OUTSIDE" : inHouseStatus === "In-House" ? "INHOUSE" : "JOB_WORK",
        };

        if (mode === "edit" && (editJob?.apiId || editJobWorkId)) {
          const jwId = editJobWorkId || editJob.apiId;
          await jobWorkApi.updateJobWork(orderItemId, jwId, jobWorkPayload);
          toast.success("Job work updated!");
        } else {
          await jobWorkApi.createJobWork(orderItemId, jobWorkPayload);
          toast.success("Job work created!");
        }
        syncOrderRow();
        navigate("/job-work", { state: sourceOrderRow ? { orderRow: sourceOrderRow } : undefined });
        return;
      } catch (err) {
        toast.error(err?.response?.data?.message || "API save failed, saving locally");
      } finally {
        setSaving(false);
      }
    }

    // Fallback to local navigation-based save
    if (mode === "edit" && editJob?.id) {
      const updatedJob = {
        ...editJob,
        partyName: formData.partyName,
        date: normalizedDate || editJob.date,
        itemSize: primaryItem.size,
        qtyPcInput: String(primaryItem.qtyPc || ""),
        qtyKgInput: qtyKgRaw,
        itemKg: qtyKgLabel,
        finish: primaryItem.finish,
        itemElementInput: String(primaryItem.element || ""),
        elementType: primaryItem.elementType,
        elementWeightGm: primaryItem.elementWeightGm,
        itemElement: elementText,
        stickerQty: String(formData.stickerQty || ""),
        inHouseStatus,
        sourceOrderId: editJob.sourceOrderId ?? null,
        sourceItemId: editJob.sourceItemId ?? null,
      };
      syncOrderRow();
      navigate("/job-work", {
        state: { savedJobWork: { mode: "edit", job: updatedJob } },
      });
      return;
    }

    const newJob = {
      id: Date.now(),
      sourceOrderId: sourceOrderRow?.orderId ?? sourceOrderRow?.id ?? null,
      sourceItemId: sourceOrderRow?.id ?? null,
      jobId: `Job ID - ${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
      partyName: formData.partyName,
      finish: primaryItem.finish || "—",
      stickerQty: String(formData.stickerQty || "0"),
      date:
        normalizedDate ||
        normalizeDateForCard(new Date().toISOString().slice(0, 10)),
      time: timeLabel,
      itemSize: primaryItem.size || "—",
      itemElementInput: String(primaryItem.element || ""),
      elementType: primaryItem.elementType || "Peti",
      elementWeightGm: primaryItem.elementWeightGm,
      itemElement: elementText,
      qtyPcInput: String(primaryItem.qtyPc || ""),
      qtyKgInput: qtyKgRaw,
      itemKg: qtyKgLabel,
      returnElement: "—",
      returnKg: "—",
      ghati: "—",
      returnKgInput: "",
      ghatiInput: "",
      returnElementInput: "",
      returnType: "Peti",
      status: "Completed",
      completionStatus: "Pending",
      inHouseStatus,
    };
    syncOrderRow();
    navigate("/job-work", {
      state: { savedJobWork: { mode: "create", job: newJob } },
    });
  };

  return (
    <SidebarLayout>
      <div className="mx-auto">
        <div className="mb-6">
          <PageHeader
            title={mode === "edit" ? "Edit Job Work" : "Move to Job Work"}
            description="Fill the job work details to create or update the record."
            action={
              <button
                type="button"
                onClick={() => navigate("/order")}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition"
                aria-label="Close and go back to job work list"
              >
                <X className="w-4 h-4" />
              </button>
            }
          />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="mb-8"
        >
          <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-5">
            <h3 className="text-2xl font-medium text-black mb-5">{mode === "edit" ? "Edit Job Work" : "Move to Job Work"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative" ref={partyRef}>
                <label className="block text-md font-medium text-black mb-2">Job Worker name*</label>
                <div
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white cursor-pointer flex items-center justify-between"
                  onClick={() => setIsPartyOpen((prev) => !prev)}
                >
                  <span className={formData.partyName ? "text-black text-md" : "text-md text-gray-500"}>
                    {formData.partyName || "Select Party"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isPartyOpen ? "rotate-180" : ""}`} />
                </div>
                {isPartyOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <input
                        type="text"
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        placeholder="Search party..."
                        className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
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
              <div>
                <label className="block text-md font-medium text-black mb-2">Chithi No.</label>
                <input
                  value={formData.chithiNo}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2.5 text-md text-gray-600 cursor-default"
                />
              </div>
              <div>
                <label className="block text-md font-medium text-black mb-2">Chithi Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-md font-medium text-black mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-md focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-2xl font-medium text-black mb-5">Add Items</h4>
              <button
                type="button"
                onClick={addItem}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition"
              >
                Add Item
              </button>
            </div>
            {items.map((item, index) => (
              <div key={index} className={`${index > 0 ? "pt-4 mt-4 border-t border-gray-200" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-black">Item {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-red-500 hover:text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={FORM_LABEL_CLASS}>Item</label>
                    <input
                      value={item.itemName}
                      onChange={(e) => updateItem(index, { itemName: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="Enter Item"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Size</label>
                    <input
                      value={item.size}
                      onChange={(e) => updateItem(index, { size: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="Enter Size"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Finish</label>
                    <input
                      value={item.finish}
                      onChange={(e) => updateItem(index, { finish: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="PVD Gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className={FORM_LABEL_CLASS}>Unit Kg/Pcs.</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={item.qtyPc}
                        onChange={(e) => updateItem(index, { qtyPc: e.target.value })}
                        className={FORM_INPUT_CLASS}
                        placeholder="100"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenUnitTypeIndex((prev) => (prev === index ? null : index));
                            setOpenElementTypeIndex(null);
                          }}
                          className={FORM_SELECT_CLASS}
                        >
                          <span>{item.unitType || "Select unit"}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${openUnitTypeIndex === index ? "rotate-180" : ""}`} />
                        </button>
                        {openUnitTypeIndex === index && (
                          <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white overflow-hidden shadow">
                            {["Kgs", "Pcs"].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  updateItem(index, { unitType: option });
                                  setOpenUnitTypeIndex(null);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Element</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={item.element}
                        onChange={(e) => updateItem(index, { element: e.target.value })}
                        className={FORM_INPUT_CLASS}
                        placeholder="02"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenElementTypeIndex((prev) => (prev === index ? null : index));
                            setOpenUnitTypeIndex(null);
                          }}
                            className={FORM_SELECT_CLASS}
                        >
                          <span className="truncate">{item.elementType}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${openElementTypeIndex === index ? "rotate-180" : ""}`} />
                        </button>
                        {openElementTypeIndex === index && (
                          <div className="absolute z-10 mt-1 w-40 rounded-md border border-gray-200 bg-white overflow-hidden shadow">
                            {ELEMENT_TYPE_OPTIONS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  updateItem(index, { elementType: option, elementWeightGm: option === "Peti" ? "900" : "" });
                                  setOpenElementTypeIndex(null);
                                }}
                                className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-100"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        value={item.elementWeightGm}
                        onChange={(e) => updateItem(index, { elementWeightGm: e.target.value })}
                        className={FORM_INPUT_CLASS}
                        placeholder={item.elementType === "Peti" ? "900" : "Enter gm"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Net Weight</label>
                    <input
                      value={item.qtyKg}
                      onChange={(e) => updateItem(index, { qtyKg: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="98 KGS"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className={FORM_LABEL_CLASS}>Process</label>
                    <div className="flex items-center gap-6 text-sm text-gray-700">
                      <label className="inline-flex items-center gap-2">
                        <span>Emrey</span>
                        <input
                          type="checkbox"
                          checked={item.processEmery}
                          onChange={(e) => updateItem(index, { processEmery: e.target.checked })}
                        />
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <span>Sartin</span>
                        <input
                          type="checkbox"
                          checked={item.processSartin}
                          onChange={(e) => updateItem(index, { processSartin: e.target.checked })}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Rate / Kgs</label>
                    <input
                      value={item.ratePerKg}
                      onChange={(e) => updateItem(index, { ratePerKg: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="875"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS}>Total Amount</label>
                    <input
                      value={item.totalAmount}
                      onChange={(e) => updateItem(index, { totalAmount: e.target.value })}
                      className={FORM_INPUT_CLASS}
                      placeholder="Auto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-center mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-12 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/job-work", { state: sourceOrderRow ? { orderRow: sourceOrderRow } : undefined })}
              disabled={saving}
              className="px-12 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
};

export default MoveToJobWork;
