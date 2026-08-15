import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FormDialog } from '@/components/form-dialog';
import { Field, FieldGrid } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { partyApi } from '@/services/apiService';

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
const DownloadStatementModal = ({
  isOpen,
  onClose,
  title = 'Download statement',
  onDownload,
  fileName = 'statement',
}) => {
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingParties, setFetchingParties] = useState(false);

  // Load parties once when the modal opens
  useEffect(() => {
    if (!isOpen) return undefined;
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
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPartyId('');
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen]);

  // Reads an error Blob body and pulls out a human message (JSON {message} or raw text).
  const readBlobError = async (blob) => {
    try {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        return json.message || json.error || text;
      } catch {
        return text;
      }
    } catch {
      return '';
    }
  };

  const handleDownload = async () => {
    if (!partyId) {
      toast.error('Please select a party');
      return;
    }
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }
    if (!endDate) {
      toast.error('Please select an end date');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const response = await onDownload(Number(partyId), startDate, endDate);

      // The response.data is a Blob (arraybuffer / blob). Handle both.
      const blob =
        response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });

      // A 2xx that is actually a JSON error (some proxies do this) or an empty body is not a PDF.
      if (blob.type && blob.type.includes('application/json')) {
        const msg = await readBlobError(blob);
        throw new Error(msg || 'Server returned an error instead of a PDF');
      }
      if (blob.size === 0) {
        throw new Error('The generated statement was empty');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_${startDate}_to_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Statement downloaded!');
      onClose();
    } catch (err) {
      // When responseType is "blob", an error response body is also a Blob — read it so the real
      // backend message (e.g. a render failure) surfaces instead of a generic "Failed" toast.
      let message = err?.message;
      const data = err?.response?.data;
      if (data instanceof Blob) {
        message = (await readBlobError(data)) || message;
      } else if (typeof data?.message === 'string') {
        message = data.message;
      }
      toast.error(message || 'Failed to download statement');
    } finally {
      setLoading(false);
    }
  };

  const partyOptions = useMemo(
    () => parties.map((p) => ({ value: String(p.id), label: p.name })),
    [parties],
  );

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description="Pick the party and the period. The statement is generated as a PDF."
      size="sm"
      submitLabel="Download"
      busyLabel="Downloading…"
      isPending={loading}
      onSubmit={handleDownload}
    >
      <div className="space-y-4">
        <Field label="Party" required>
          {fetchingParties ? (
            <div className="flex h-9 items-center gap-2 text-[12.5px] text-ink-3">
              <Loader2 className="size-4 animate-spin" /> Loading parties…
            </div>
          ) : (
            <SearchableSelect
              ariaLabel="Party"
              options={partyOptions}
              value={partyId}
              onChange={setPartyId}
              placeholder="Select a party"
              searchPlaceholder="Search parties…"
              className="w-full"
            />
          )}
        </Field>

        <FieldGrid columns={2}>
          <Field label="Start date" htmlFor="statement-start" required>
            <Input
              id="statement-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="End date" htmlFor="statement-end" required>
            <Input id="statement-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </FieldGrid>
      </div>
    </FormDialog>
  );
};

export default DownloadStatementModal;
