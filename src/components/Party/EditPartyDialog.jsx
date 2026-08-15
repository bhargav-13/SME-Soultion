import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import GroupPicker from './GroupPicker';
import { FormDialog } from '@/components/form-dialog';
import { Field, FieldGrid } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';

const PARTY_TYPES = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Vendor', value: 'VENDOR' },
  { label: 'Both', value: 'BOTH' },
];

const EditPartyDialog = ({ isOpen, onClose, onSave, initialData = null, groups = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    partyType: '',
  });
  const [groupChoice, setGroupChoice] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || initialData.contact || '',
        gstin: initialData.gstin || '',
        partyType: initialData.partyType || initialData.type || '',
      });
      setGroupChoice(initialData.groupId ? String(initialData.groupId) : '');
      setNewGroupName('');
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please fill in the party name');
      return;
    }
    onSave({ ...formData, groupChoice, newGroupName });
  };

  const typeOptions = useMemo(() => PARTY_TYPES.map((t) => ({ value: t.value, label: t.label })), []);

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Edit party"
      description="Contact and GST details, plus which group login this company belongs to."
      size="lg"
      submitLabel="Save changes"
      onSubmit={handleSave}
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="party-name" required>
          <Input
            id="party-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter party name"
          />
        </Field>

        <FieldGrid columns={2}>
          <Field label="GSTIN" htmlFor="party-gstin">
            <Input
              id="party-gstin"
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="24AAAAA0000A1Z5"
              className="font-mono"
            />
          </Field>

          <Field label="Type" required>
            <SearchableSelect
              ariaLabel="Party type"
              options={typeOptions}
              value={formData.partyType}
              onChange={(value) => setFormData((prev) => ({ ...prev, partyType: value }))}
              placeholder="Select type"
              searchPlaceholder="Search types…"
              className="w-full"
            />
          </Field>

          <Field label="Contact number" htmlFor="party-phone">
            <Input
              id="party-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter contact number"
              className="font-mono"
            />
          </Field>

          <Field label="Email ID" htmlFor="party-email">
            <Input
              id="party-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
            />
          </Field>
        </FieldGrid>

        <GroupPicker
          groups={groups}
          value={groupChoice}
          onChange={setGroupChoice}
          newName={newGroupName}
          onNewNameChange={setNewGroupName}
        />
      </div>
    </FormDialog>
  );
};

export default EditPartyDialog;
