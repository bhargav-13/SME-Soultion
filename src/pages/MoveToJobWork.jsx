import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarLayout from "../components/SidebarLayout";
import PageHeader from "../components/PageHeader";
import toast from "react-hot-toast";
import { jobWorkApi } from "../services/apiService";

const EMPTY_FORM = {
  partyName: "",
  partyId: "",
  date: "",
  size: "",
  sizeId: "",
  qtyPc: "",
  qtyKg: "",
  finish: "",
  element: "",
  elementType: "Peti",
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
  return { element: raw, elementType: "Drum" };
};

const MoveToJobWork = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isElementTypeOpen, setIsElementTypeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const mode = location.state?.mode === "edit" ? "edit" : "create";
  const editJob = location.state?.job || null;
  const sourceOrderRow = location.state?.prefillOrderRow || null;
  // jobWorkId / orderItemId passed from new JobWork.jsx edit flow
  const editJobWorkId  = location.state?.jobWorkId   || null;
  const editOrderItemId = location.state?.orderItemId || null;

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
    if (mode === "edit" && editJobWorkId && editOrderItemId && !editJob) {
      const fetchJobWork = async () => {
        try {
          const res = await jobWorkApi.getJobWorkById(Number(editOrderItemId), Number(editJobWorkId));
          const jw = res.data;
          const sizeLabel = [
            jw.size?.sizeInInch,
            jw.size?.sizeInMm ? `(${jw.size.sizeInMm})` : null,
          ].filter(Boolean).join(" ");
          setFormData({
            partyName: jw.party?.name || "",
            partyId: jw.party?.id || "",
            date: normalizeDateForInput(jw.jobDate),
            size: sizeLabel || "",
            sizeId: jw.size?.id || "",
            qtyPc: jw.qtyPc != null ? String(jw.qtyPc) : "",
            qtyKg: jw.qtyKg != null ? String(jw.qtyKg) : "",
            finish: jw.finish || "",
            element: jw.elementCount != null ? String(jw.elementCount) : "",
            elementType: jw.elementType === "DRUM" ? "Drum" : "Peti",
            stickerQty: jw.stickerQty != null ? String(jw.stickerQty) : "",
          });
        } catch (err) {
          toast.error(err?.response?.data?.message || "Failed to load job work data");
        }
      };
      fetchJobWork();
      return;
    }

    if (mode === "edit" && editJob) {
      const elementParts = extractElementParts(
        editJob.itemElementInput || editJob.itemElement,
      );
      setFormData({
        partyName: editJob.partyName || "",
        date: normalizeDateForInput(editJob.date),
        size: editJob.itemSize || "",
        qtyPc: editJob.qtyPcInput || "",
        qtyKg:
          editJob.qtyKgInput ||
          String(editJob.itemKg || "")
            .replace(/kg/i, "")
            .trim(),
        finish: editJob.finish || "",
        element: editJob.itemElementInput || elementParts.element,
        elementType: editJob.elementType || elementParts.elementType,
        stickerQty: editJob.stickerQty || "",
      });
      return;
    }

    if (sourceOrderRow) {
      setFormData({
        partyName: sourceOrderRow.partyName || "",
        partyId: sourceOrderRow.partyId || "",
        date: normalizeDateForInput(sourceOrderRow.date),
        size: sourceOrderRow.size || "",
        sizeId: sourceOrderRow.sizeId || "",
        qtyPc:
          sourceOrderRow.qtyPc === "—"
            ? ""
            : String(sourceOrderRow.qtyPc ?? ""),
        qtyKg:
          sourceOrderRow.qtyKg === "—"
            ? ""
            : String(sourceOrderRow.qtyKg ?? "")
                .replace(/kg/i, "")
                .trim(),
        finish: sourceOrderRow.plating || "",
        element: "",
        elementType: "Peti",
        stickerQty:
          sourceOrderRow.stickerQty === "—"
            ? ""
            : String(sourceOrderRow.stickerQty ?? ""),
      });
      return;
    }

    setFormData(EMPTY_FORM);
  }, [mode, editJob, sourceOrderRow, editJobWorkId, editOrderItemId]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const qtyKgRaw = String(formData.qtyKg || "").trim();
    const qtyKgLabel = qtyKgRaw ? `${qtyKgRaw}Kg` : "—";
    const normalizedDate = normalizeDateForCard(formData.date);
    const elementText =
      formData.element && formData.elementType
        ? `${formData.element}${formData.elementType === "Peti" ? "P" : ""}`
        : "—";

    // Try to save via API if we have the required IDs
    const orderItemId = sourceOrderRow?.id || editOrderItemId || editJob?.sourceItemId;
    const partyId = formData.partyId || sourceOrderRow?.partyId;
    const sizeId = formData.sizeId || sourceOrderRow?.sizeId;

    if (orderItemId && partyId && sizeId) {
      setSaving(true);
      try {
        const jobWorkPayload = {
          partyId: Number(partyId),
          sizeId: Number(sizeId),
          jobDate: formData.date || new Date().toISOString().slice(0, 10),
          qtyPc: parseFloat(formData.qtyPc) || 0,
          qtyKg: qtyKgRaw ? parseFloat(qtyKgRaw) : undefined,
          finish: formData.finish || undefined,
          elementCount: formData.element ? parseFloat(formData.element) : undefined,
          elementType: formData.elementType === "Peti" ? "PETI" : "DRUM",
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
        itemSize: formData.size,
        qtyPcInput: String(formData.qtyPc || ""),
        qtyKgInput: qtyKgRaw,
        itemKg: qtyKgLabel,
        finish: formData.finish,
        itemElementInput: String(formData.element || ""),
        elementType: formData.elementType,
        itemElement: elementText,
        stickerQty: String(formData.stickerQty || ""),
        inHouseStatus,
        sourceOrderId: editJob.sourceOrderId ?? null,
        sourceItemId: editJob.sourceItemId ?? null,
      };
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
      finish: formData.finish || "—",
      stickerQty: String(formData.stickerQty || "0"),
      date:
        normalizedDate ||
        normalizeDateForCard(new Date().toISOString().slice(0, 10)),
      time: timeLabel,
      itemSize: formData.size || "—",
      itemElementInput: String(formData.element || ""),
      elementType: formData.elementType || "Peti",
      itemElement: elementText,
      qtyPcInput: String(formData.qtyPc || ""),
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
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-md font-medium text-black mb-2">
                Party Name*
              </label>
              <input
                value={formData.partyName}
                onChange={(e) => handleChange("partyName", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                placeholder="Enter Party Name"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Size</label>
              <input
                value={formData.size}
                onChange={(e) => handleChange("size", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                placeholder="Select Size"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Qty Pc.</label>
              <input
                value={formData.qtyPc}
                onChange={(e) => handleChange("qtyPc", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                placeholder="Enter Pc."
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Qty Kg</label>
              <input
                value={formData.qtyKg}
                onChange={(e) => handleChange("qtyKg", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                placeholder="Auto"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Finish</label>
              <input
                value={formData.finish}
                onChange={(e) => handleChange("finish", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                placeholder="S.S + 16"
              />
            </div>
            <div>
              <label className="block text-md font-medium text-black mb-2">Element</label>
              <div className="flex items-center gap-3">
                <input
                  value={formData.element}
                  onChange={(e) => handleChange("element", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                  placeholder="2"
                />
                <div className="relative min-w-[130px]">
                  <button
                    type="button"
                    onClick={() => setIsElementTypeOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-gray-500 transition text-sm"
                  >
                    <span>{formData.elementType}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${isElementTypeOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isElementTypeOpen && (
                    <div className="absolute z-10 mt-2 w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow">
                      {["Peti", "Drum"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            handleChange("elementType", option);
                            setIsElementTypeOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
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
              <label className="block text-md font-medium text-black mb-2">
                Sticker Qty.
              </label>
              <input
                value={formData.stickerQty}
                onChange={(e) => handleChange("stickerQty", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition placeholder:text-sm placeholder:text-gray-500"
                placeholder="2"
              />
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              type="submit"
              disabled={saving}
              className="px-12 py-2 bg-black text-white rounded-xl hover:bg-gray-900 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/job-work", { state: sourceOrderRow ? { orderRow: sourceOrderRow } : undefined })}
              disabled={saving}
              className="px-12 py-2 border border-black text-black rounded-xl hover:bg-gray-50 transition font-medium"
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
