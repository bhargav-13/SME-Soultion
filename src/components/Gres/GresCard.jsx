import React, { useMemo, useState } from "react";
import { CircleCheck, ChevronDown, Printer, SquarePen, Trash2 } from "lucide-react";
import GresStatusDropdown from "./GresStatusDropdown";
import GresTypeDropdown from "./GresTypeDropdown";

const round3 = (n) => Math.round(n * 1000) / 1000;
const fmt = (v) => (v == null || v === "" ? "—" : v);
const fmtDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-IN");
  } catch {
    return s;
  }
};

const GresCard = ({
  gres,
  onEdit,
  onDelete,
  onStatusChange,
  onTypeChange,
  onReturnRecord,
  onEditReturn,
  onDeleteReturn,
  onPrint,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [printLoading, setPrintLoading] = useState(null);
  const primaryItem = gres.items?.[0] || {};
  const returns = useMemo(() => gres.returns || [], [gres.returns]);

  const totals = useMemo(() => {
    const totalReturn = round3(returns.reduce((sum, item) => sum + (Number(item.returnKg) || 0), 0));
    const totalNet = round3(returns.reduce((sum, item) => sum + (Number(item.netKg) || 0), 0));
    const totalGhati = round3(returns.reduce((sum, item) => sum + (Number(item.ghati) || 0), 0));
    return { totalReturn, totalNet, totalGhati };
  }, [returns]);

  const productName = primaryItem.itemName || primaryItem.size || "—";
  const sizeLabel = primaryItem.size || "—";
  const elementLabel = primaryItem.element != null
    ? `${primaryItem.element} ${primaryItem.elementType === "DRUM" ? "Drum" : "Peti"}`
    : "—";

  const handlePrint = () => onPrint?.(gres.id, "JAVAK", setPrintLoading);

  return (
    <div className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm">
      {/* Product name - prominent above */}
      <div className="mb-2">
        <span className="text-base font-semibold text-black">{productName}</span>
        {primaryItem.size && primaryItem.size !== productName && (
          <span className="ml-2 text-sm text-gray-500">({primaryItem.size})</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3 text-black">
            <span className="font-semibold text-sm">{gres.chithiNo || `GRES-${gres.id}`}</span>
            <button type="button" onClick={onEdit} aria-label="Edit gres" className="text-gray-500 hover:text-gray-800 transition">
              <SquarePen className="w-4 h-4" />
            </button>
            <button type="button" onClick={onDelete} aria-label="Delete gres" className="text-red-400 hover:text-red-600 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
            <span>{gres.vendorName || "—"}</span>
            <span className="w-1 h-1 rounded-full bg-gray-400 inline-block" />
            <span>Rate: <span className="font-bold text-black">{fmt(primaryItem.ratePerKg)}</span></span>
          </div>
        </div>
        <div className="text-right text-sm text-gray-500 flex-shrink-0">
          <p>Date: <span className="font-bold">{fmtDate(gres.date)}</span></p>
          <p>Time: <span className="font-bold">{fmt(gres.time)}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-black font-semibold">Items</p>
            <button
              type="button"
              onClick={handlePrint}
              disabled={printLoading === "javak"}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-gray-300 rounded-md text-black hover:bg-gray-100 transition disabled:opacity-50"
            >
              {printLoading === "javak" ? "Printing…" : "Print"} <Printer className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 text-xs text-gray-400 mb-1">
            <span>Size</span>
            <span className="text-center">Element</span>
            <span className="text-center">Kg.</span>
            <span className="text-right">Rate/Kg</span>
          </div>
          <div className="grid grid-cols-4 text-sm text-gray-700">
            <span className="font-bold">{sizeLabel}</span>
            <span className="text-center font-bold">{elementLabel}</span>
            <span className="text-center font-bold">{fmt(primaryItem.qtyKg)} Kg</span>
            <span className="text-right font-bold">{fmt(primaryItem.ratePerKg)}</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">Qty Pc: <span className="font-bold text-black">{fmt(primaryItem.qtyPc)}</span></div>
        </div>

        <div className="border border-gray-200 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-black font-semibold">Return</p>
              {returns.length > 0 && <span className="text-xs font-medium text-gray-500">({returns.length})</span>}
            </div>
            <div className="flex items-center gap-2">
              {returns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="text-xs font-medium text-gray-500 hover:text-black transition flex items-center gap-1"
                >
                  {expanded ? "Collapse" : "Expand"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </button>
              )}
              <button
                type="button"
                onClick={handlePrint}
                disabled={printLoading === "javak"}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-sm border border-gray-300 rounded-md text-black hover:bg-gray-100 transition disabled:opacity-50"
              >
                {printLoading === "javak" ? "Printing…" : "Print"} <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {returns.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No return recorded yet</p>
          ) : (
            <>
              {expanded && (
                <div className="space-y-3 mb-3">
                  {returns.map((ret) => (
                    <div key={ret.id} className="border border-gray-200 rounded-lg bg-white p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-400">Return: <span className="font-medium text-gray-600">{fmtDate(ret.returnDate)}</span></span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => onEditReturn(ret)} className="text-gray-400 hover:text-gray-700 transition">
                            <SquarePen className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => onDeleteReturn(ret)} className="text-red-300 hover:text-red-500 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 text-xs text-gray-400 mb-0.5">
                        <span>Element</span>
                        <span className="text-center">Return Kg.</span>
                        <span className="text-center">Net Kg</span>
                        <span className="text-right">Rate/Kg</span>
                      </div>
                      <div className="grid grid-cols-4 text-sm text-gray-700">
                        <span className="font-bold">{ret.returnElement || "—"}</span>
                        <span className="text-center font-bold">{fmt(ret.returnKg)} Kg</span>
                        <span className="text-center font-bold">{fmt(ret.netKg)} Kg</span>
                        <span className="text-right font-bold">{fmt(ret.rsKg)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dashed border-gray-300 pt-2">
                <div className="grid grid-cols-3 text-xs text-gray-400 mb-0.5">
                  <span>Total Return</span>
                  <span className="text-center">Total Net</span>
                  <span className="text-right">Total Ghati</span>
                </div>
                <div className="grid grid-cols-3 text-sm text-gray-700">
                  <span className="font-bold">{totals.totalReturn ? `${totals.totalReturn} Kg` : "—"}</span>
                  <span className="text-center font-bold">{totals.totalNet ? `${totals.totalNet} Kg` : "—"}</span>
                  <span className="text-right font-bold">{totals.totalGhati || "—"}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <GresStatusDropdown value={gres.status} onChange={(value) => onStatusChange(gres, value)} disabled={gres.status === "COMPLETE"} />
        <GresTypeDropdown value={gres.gresType} onChange={(value) => onTypeChange(gres, value)} />
        <button
          type="button"
          onClick={onReturnRecord}
          className="inline-flex items-center gap-2 px-5 py-1.5 rounded-md bg-[#b9d8e9] text-black text-sm font-medium hover:bg-[#a6cde3] transition"
        >
          Return Record <CircleCheck className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default GresCard;
