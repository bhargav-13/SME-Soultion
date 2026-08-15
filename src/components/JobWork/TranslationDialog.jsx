import { useCallback, useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import toast from 'react-hot-toast';
import { ViewDialog } from '@/components/form-dialog';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { translationApi } from '@/services/apiService';
import { invalidateChitthiDictionary } from '@/utils/jobWorkChitthi';

const TABS = [
  { key: 'FINISH', label: 'Finish' },
  { key: 'PARTY', label: 'Party' },
];

/**
 * Editor for the global party/finish translation dictionary used by the Job Work print.
 * A toggle switches between the Finish and Party lists; Hindi + Gujarati are editable per row
 * and saved back with PUT /api/v1/translations. Rows are tracked by their own id — party rows
 * upsert by partyId (name-independent), finish rows by sourceText.
 */
const TranslationDialog = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('FINISH');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Set of row ids edited since the last fetch.
  const [dirty, setDirty] = useState(new Set());

  const fetchRows = useCallback(async (type) => {
    setLoading(true);
    try {
      const res = await translationApi.getTranslations(type);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setRows(list);
      setDirty(new Set());
    } catch {
      toast.error('Failed to load translations');
      setRows([]);
      setDirty(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchRows(activeTab);
  }, [isOpen, activeTab, fetchRows]);

  const handleEdit = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setDirty((prev) => new Set(prev).add(id));
  };

  const handleSave = async () => {
    if (dirty.size === 0) {
      toast('No changes to save');
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
            hindi: r.hindi ?? '',
            gujarati: r.gujarati ?? '',
          }),
        ),
      );
      // Drop the print's cached dictionary so the next chitthi picks up these edits immediately.
      invalidateChitthiDictionary();
      toast.success(`Saved ${changed.length} translation${changed.length !== 1 ? 's' : ''}`);
      await fetchRows(activeTab);
    } catch {
      toast.error('Failed to save translations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ViewDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Translations"
      description="Hindi & Gujarati shown on the job work print. Edits apply to every print."
      size="xl"
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || dirty.size === 0}>
            {saving ? 'Saving…' : dirty.size > 0 ? `Save ${dirty.size} change${dirty.size !== 1 ? 's' : ''}` : 'Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="px-5">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <ListSkeleton rows={5} className="h-10" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Languages}
            title={`No ${activeTab === 'PARTY' ? 'party' : 'finish'} translations yet`}
            description="They appear here once a job work is created, or after importing the language sheet."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-line">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-1/3 px-3 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase">
                    {activeTab === 'PARTY' ? 'Party' : 'Finish'}
                  </TableHead>
                  <TableHead className="px-3 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase">
                    Hindi
                  </TableHead>
                  <TableHead className="px-3 text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase">
                    Gujarati
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="border-line-2">
                    <TableCell className="px-3 py-2 text-[13px] whitespace-normal text-ink">{r.sourceText}</TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        aria-label={`Hindi for ${r.sourceText}`}
                        value={r.hindi ?? ''}
                        onChange={(e) => handleEdit(r.id, 'hindi', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Input
                        type="text"
                        aria-label={`Gujarati for ${r.sourceText}`}
                        value={r.gujarati ?? ''}
                        onChange={(e) => handleEdit(r.id, 'gujarati', e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </ViewDialog>
  );
};

export default TranslationDialog;
