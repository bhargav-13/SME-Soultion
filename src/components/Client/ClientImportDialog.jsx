import React, { useEffect, useRef, useState } from "react";
import { axiosInstance } from "../../services/apiService";
import { partyApi } from "../../services/apiService";
import toast from "react-hot-toast";

const ClientImportDialog = ({ isOpen, parties: initialParties, onClose, onImported }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [partySearch, setPartySearch] = useState("");
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parties, setParties] = useState(initialParties);

  // "Create new client" mini-form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGst, setNewGst] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { setParties(initialParties); }, [initialParties]);

  if (!isOpen) return null;

  const filteredParties = parties.filter((p) =>
    p.name?.toLowerCase().includes(partySearch.toLowerCase())
  );

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const name = f.name.replace(/\.[^/.]+$/, "");
    setPartySearch(name);
    setSelectedParty(null);
    setShowDropdown(true);
    setShowCreateForm(false);
  };

  const handlePartySelect = (party) => {
    setSelectedParty(party);
    setPartySearch(party.name);
    setShowDropdown(false);
    setShowCreateForm(false);
  };

  const handleCreateClient = async () => {
    if (!partySearch.trim()) return;
    setCreating(true);
    try {
      const res = await partyApi.createParty({
        name: partySearch.trim(),
        gst: newGst.trim(),
        contactNo: newContact.trim(),
        email: newEmail.trim(),
        partyType: "CUSTOMER",
      });
      const created = res.data;
      setParties((prev) => [...prev, created]);
      setSelectedParty(created);
      setPartySearch(created.name);
      setShowDropdown(false);
      setShowCreateForm(false);
      setNewGst("");
      setNewContact("");
      setNewEmail("");
      toast.success(`Client "${created.name}" created`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create client");
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    if (!file) { toast.error("Please select a file"); return; }
    if (!selectedParty) { toast.error("Please select a client"); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axiosInstance.post(
        `/api/v1/clients/${selectedParty.id}/inventory/import`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const result = res.data;
      toast.success(
        `Imported ${result.rowsImported} rows` +
          (result.rowsSkipped > 0 ? `, ${result.rowsSkipped} skipped` : "")
      );
      onImported(selectedParty);
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPartySearch("");
    setSelectedParty(null);
    setShowDropdown(false);
    setShowCreateForm(false);
    setNewGst("");
    setNewContact("");
    setNewEmail("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Import Client Pricing</h2>
        <p className="text-sm text-gray-500 mb-5">
          Upload an Excel file — packing & pricing columns will be imported. Sizes are matched
          to the stock master by Size In Inch + Size In MM.
        </p>

        {/* File picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Excel File</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-gray-400 transition"
          >
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 7a2 2 0 012-2h3l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <span className="text-sm text-gray-600 truncate">
              {file ? file.name : "Click to choose .xlsx file"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Party selector */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <input
            type="text"
            value={partySearch}
            onChange={(e) => {
              setPartySearch(e.target.value);
              setSelectedParty(null);
              setShowDropdown(true);
              setShowCreateForm(false);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Type to search client…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          {showDropdown && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredParties.length > 0
                ? filteredParties.map((p) => (
                    <li
                      key={p.id}
                      onMouseDown={() => handlePartySelect(p)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                    >
                      {p.name}
                    </li>
                  ))
                : partySearch.trim() && (
                    <li
                      onMouseDown={() => {
                        setShowDropdown(false);
                        setShowCreateForm(true);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create &ldquo;{partySearch}&rdquo;
                    </li>
                  )}
            </ul>
          )}
        </div>

        {/* Create new client form */}
        {showCreateForm && (
          <div className="mb-4 border border-blue-100 bg-blue-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-blue-700 mb-1">
              Create new client: <span className="font-semibold">{partySearch}</span>
            </p>
            <input
              type="text"
              placeholder="GST number"
              value={newGst}
              onChange={(e) => setNewGst(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              type="text"
              placeholder="Contact number"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              type="button"
              onClick={handleCreateClient}
              disabled={creating}
              className="w-full py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Client"}
            </button>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !file || !selectedParty}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientImportDialog;
