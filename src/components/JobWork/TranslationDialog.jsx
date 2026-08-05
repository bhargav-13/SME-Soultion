import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { translationApi } from "../../services/apiService";
import { invalidateChitthiDictionary } from "../../utils/jobWorkChitthi";

const TABS = [
  { key: "FINISH", label: "Finish" },
  { key: "PARTY", label: "Party" },
];

/**
 * Editor for the global party/finish translation dictionary used by the Job Work print.
 * A toggle switches between the Finish and Party lists; Hindi + Gujarati are editable per row
 * and saved back with PUT /api/v1/translations. Rows are tracked by their own id — party rows
 * upsert by partyId (name-independent), finish rows by sourceText.
 */
const TranslationDialog = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("FINISH");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Set of row ids edited since the last fetch.
  const [dirty, setDirty] = useState(new Set());

  const fetchRows = useCallback(async (type) => {
    setLoading(true);
    try {
      const res = await translationApi.getTranslations(type);
      const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setRows(list);
      setDirty(new Set());
    } catch {
      toast.error("Failed to load translations");
      setRows([]);
      setDirty(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchRows(activeTab);
  }, [isOpen, activeTab, fetchRows]);

  if (!isOpen) return null;

  const handleTabChange = (key) => {
    if (key === activeTab) return;
    setActiveTab(key);
  };

  const handleEdit = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setDirty((prev) => new Set(prev).add(id));
  };

  const handleSave = async () => {
    if (dirty.size === 0) {
      toast("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const changed = rows.filter((r) => dirty.has(r.id));
      await Promise.all(
        changed.map((r) =>
          translationApi.upsertTranslation({
            type: activeTab,
            partyId: r.partyId,
            sourceText: r.sourceText,
            hindi: r.hindi ?? "",
            gujarati: r.gujarati ?? "",
          })
        )
      );
      // Drop the print's cached dictionary so the next chitthi picks up these edits immediately.
      invalidateChitthiDictionary();
      toast.success(`Saved ${changed.length} translation${changed.length !== 1 ? "s" : ""}`);
      await fetchRows(activeTab);
    } catch {
      toast.error("Failed to save translations");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Translations</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Hindi &amp; Gujarati shown on the Job Work print. Edits apply to every print.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle */}
        <div className="px-6 pt-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`px-5 py-1.5 text-sm rounded-md transition ${
                  activeTab === t.key
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">
              No {activeTab === "PARTY" ? "party" : "finish"} translations yet. They appear here once
              a job work is created (or after importing the language sheet).
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-3 w-1/3">{activeTab === "PARTY" ? "Party" : "Finish"}</th>
                  <th className="pb-2 px-3">Hindi</th>
                  <th className="pb-2 pl-3">Gujarati</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-800 align-middle">{r.sourceText}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.hindi ?? ""}
                        onChange={(e) => handleEdit(r.id, "hindi", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <input
                        type="text"
                        value={r.gujarati ?? ""}
                        onChange={(e) => handleEdit(r.id, "gujarati", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || dirty.size === 0}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TranslationDialog;
