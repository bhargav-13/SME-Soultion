import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Field } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { appSettingsApi, FIXED_BAJAAR_KEY } from '@/services/apiService';

/**
 * The one house rate every "Fixed bajaar" chitthi is priced at.
 *
 * It lives here rather than on the job-work card because it is a single number shared by all of
 * them — the whole reason for calling it fixed. Saving it moves every fixed chitthi at once, which
 * the dialog says out loud so nobody edits it expecting a local change.
 */
const FixedBajaarDialog = ({ isOpen, onClose, onSaved }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    appSettingsApi
      .getAll()
      .then((res) => setValue(res.data?.[FIXED_BAJAAR_KEY] ?? ''))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSave = async () => {
    const trimmed = String(value).trim();
    if (trimmed !== '' && Number.isNaN(Number(trimmed))) {
      toast.error('Fixed bajaar must be a number');
      return;
    }
    setSaving(true);
    try {
      await appSettingsApi.put(FIXED_BAJAAR_KEY, trimmed);
      toast.success('Fixed bajaar saved');
      onSaved?.(trimmed === '' ? null : trimmed);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[26rem]">
        <DialogHeader>
          <DialogTitle>Fixed bajaar</DialogTitle>
          <DialogDescription>
            The standing market rate. Every job work set to “Fixed bajaar” shows this amount, so
            changing it here changes it on all of them. Leave it blank to clear it.
          </DialogDescription>
        </DialogHeader>

        <Field label="Amount">
          <Input
            type="number"
            step="any"
            inputMode="decimal"
            value={value}
            disabled={loading}
            placeholder={loading ? 'Loading…' : 'Not set'}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono"
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FixedBajaarDialog;
