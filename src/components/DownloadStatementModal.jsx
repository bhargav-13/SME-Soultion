import React, { useEffect, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { partyApi } from "../services/apiService";
import toast from "react-hot-toast";

/**
 * DownloadStatementModal
 *
 * Props:
 *  - isOpen        {boolean}           Whether the modal is visible
 *  - onClose       {() => void}        Callback to close the modal
 *  - title         {string}            Modal title, e.g. "Download Gres Statement"
 *  - onDownload    {(partyId, startDate, endDate) => Promise<Blob|ArrayBuffer>}
 *                                      Called when the user confirms; must return the PDF blob.
 *  - fileName      {string}            Default filename for the downloaded file (without extension)
 */
const DownloadStatementModal = ({ isOpen, onClose, title = "Download Statement", onDownload, fileName = "statement" }) => {
  const [parties, setParties]       = useState([]);
  const [partyId, setPartyId]       = useState("");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [fetchingParties, setFetchingParties] = useState(false);

  // Load parties once when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setFetchingParties(true);
      try {
        const res = await partyApi.getAllParties();
        if (!cancelled) {
          const list = res.data?.data || res.data || [];
          setParties(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) setParties([]);
      } finally {
        if (!cancelled) setFetchingParties(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPartyId("");
      setStartDate("");
      setEndDate("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!partyId) { toast.error("Please select a party"); return; }
    if (!startDate) { toast.error("Please select a start date"); return; }
    if (!endDate)   { toast.error("Please select an end date");   return; }
    if (startDate > endDate) { toast.error("Start date must be before end date"); return; }

    setLoading(true);
    try {
      const response = await onDownload(Number(partyId), startDate, endDate);

      // The response.data is a Blob (arraybuffer / blob). Handle both.
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href        = url;
      a.download    = `${fileName}_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Statement downloaded!");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to download statement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-gray-600" />
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Party selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Party</label>
            {fetchingParties ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading parties…
              </div>
            ) : (
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
              >
                <option value="">Select a party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Downloading…</>
            ) : (
              <><Download className="w-4 h-4" /> Download</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadStatementModal;
