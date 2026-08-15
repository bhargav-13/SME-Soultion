import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { axiosInstance, partyApi } from '@/services/apiService';

const ClientImportDialog = ({ isOpen, parties: initialParties, onClose, onImported }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [partySearch, setPartySearch] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parties, setParties] = useState(initialParties);

  // "Create new client" mini-form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGst, setNewGst] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setParties(initialParties);
  }, [initialParties]);

  const filteredParties = parties.filter((p) => p.name?.toLowerCase().includes(partySearch.toLowerCase()));

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const name = f.name.replace(/\.[^/.]+$/, '');
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
        partyType: 'CUSTOMER',
      });
      const created = res.data;
      setParties((prev) => [...prev, created]);
      setSelectedParty(created);
      setPartySearch(created.name);
      setShowDropdown(false);
      setShowCreateForm(false);
      setNewGst('');
      setNewContact('');
      setNewEmail('');
      toast.success(`Client "${created.name}" created`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create client');
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    if (!selectedParty) {
      toast.error('Please select a client');
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axiosInstance.post(`/api/v1/clients/${selectedParty.id}/inventory/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res.data;
      toast.success(
        `Imported ${result.rowsImported} rows` + (result.rowsSkipped > 0 ? `, ${result.rowsSkipped} skipped` : ''),
      );
      onImported(selectedParty);
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPartySearch('');
    setSelectedParty(null);
    setShowDropdown(false);
    setShowCreateForm(false);
    setNewGst('');
    setNewContact('');
    setNewEmail('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="Import client pricing"
      description="Upload an Excel file — packing & pricing columns will be imported. Sizes are matched to the stock master by Size In Inch + Size In MM."
      onSubmit={handleImport}
      submitLabel="Import"
      busyLabel="Importing…"
      isPending={importing}
      submitDisabled={!file || !selectedParty}
    >
      {/* File picker */}
      <div className="mb-4">
        <label className="mb-1 block text-[12.5px] font-medium text-ink-2">Excel file</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-line px-4 py-3 transition hover:border-primary/40"
        >
          <FileSpreadsheet className="size-5 shrink-0 text-ink-3" />
          <span className="truncate text-[13px] text-ink-2">{file ? file.name : 'Click to choose .xlsx file'}</span>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Party selector */}
      <div className="relative mb-4">
        <label className="mb-1 block text-[12.5px] font-medium text-ink-2">Client</label>
        <Input
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
        />
        {showDropdown && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-pop">
            {filteredParties.length > 0
              ? filteredParties.map((p) => (
                  <li
                    key={p.id}
                    onMouseDown={() => handlePartySelect(p)}
                    className="cursor-pointer px-3 py-2 text-[13px] hover:bg-surface-2"
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
                    className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-[13px] text-primary hover:bg-primary-soft"
                  >
                    <Plus className="size-4" />
                    Create &ldquo;{partySearch}&rdquo;
                  </li>
                )}
          </ul>
        )}
      </div>

      {/* Create new client form */}
      {showCreateForm && (
        <div className="mb-4 space-y-2 rounded-lg border border-info/30 bg-info-soft p-3">
          <p className="mb-1 text-[12px] font-medium text-info">
            Create new client: <span className="font-semibold">{partySearch}</span>
          </p>
          <Input placeholder="GST number" value={newGst} onChange={(e) => setNewGst(e.target.value)} className="h-8 bg-surface" />
          <Input
            placeholder="Contact number"
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            className="h-8 bg-surface"
          />
          <Input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="h-8 bg-surface"
          />
          <Button type="button" size="sm" onClick={handleCreateClient} disabled={creating} className="w-full">
            {creating ? 'Creating…' : 'Create client'}
          </Button>
        </div>
      )}
    </FormDialog>
  );
};

export default ClientImportDialog;
