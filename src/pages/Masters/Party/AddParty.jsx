import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import PartiesTable from '@/components/Party/PartiesTable';
import EditPartyDialog from '@/components/Party/EditPartyDialog';
import GroupPicker, { NEW_GROUP } from '@/components/Party/GroupPicker';
import GroupLoginsModal from '@/components/Party/GroupLoginsModal';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { Field, FieldGrid } from '@/components/form-field';
import { PageBody, PageHeader, Section } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { partyApi, partyGroupApi } from '@/services/apiService';

const PARTY_TYPES = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Vendor', value: 'VENDOR' },
  { label: 'Both', value: 'BOTH' },
];

const typeLabel = (partyType) => PARTY_TYPES.find((t) => t.value === partyType)?.label || partyType || '';

const EMPTY_FORM = {
  partyName: '',
  email: '',
  phone: '',
  gstNumber: '',
  partyType: '',
};

const AddParty = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY_FORM);

  const [parties, setParties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupChoice, setGroupChoice] = useState(''); // "" | groupId | NEW_GROUP
  const [newGroupName, setNewGroupName] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    partyId: null,
    partyName: '',
  });
  const [editDialog, setEditDialog] = useState({
    isOpen: false,
    data: null,
  });

  const { filters, setFilter, search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } =
    useListFilters({ defaults: { type: '', group: '' } });

  useEffect(() => {
    fetchParties();
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await partyGroupApi.getAll();
      setGroups(res.data || []);
    } catch {
      // Non-fatal — grouping just won't be available.
    }
  };

  const fetchParties = async () => {
    try {
      setLoading(true);
      const response = await partyApi.getAllParties();
      const partiesData = response.data;

      const transformedParties = partiesData.map((party) => ({
        id: party.id,
        name: party.name,
        email: party.email,
        phone: party.contactNo,
        contact: party.contactNo,
        gstin: party.gst,
        type: typeLabel(party.partyType),
        partyType: party.partyType,
        groupId: party.groupId ?? '',
        groupName: party.groupName || '',
      }));

      setParties(transformedParties);
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch parties');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Turn a group choice ("", an existing group id, or NEW_GROUP) into a concrete group id,
   * creating the group first when needed. Returns null for "no group".
   */
  const resolveGroupId = async (choice, name) => {
    if (choice === '' || choice == null) return null;
    if (choice === NEW_GROUP) {
      if (!name.trim()) {
        toast.error('Enter a name for the new group');
        throw new Error('missing group name');
      }
      const res = await partyGroupApi.create({ name: name.trim() });
      await fetchGroups();
      if (res.data?.username && res.data?.initialPassword) {
        toast.success(`Group login created — ${res.data.username} / ${res.data.initialPassword}`, {
          duration: 8000,
        });
      }
      return res.data.id;
    }
    return Number(choice);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partyName.trim()) {
      toast.error('Please enter party name');
      return;
    }
    if (!formData.partyType) {
      toast.error('Please select party type');
      return;
    }

    setLoading(true);
    try {
      const createData = {
        name: formData.partyName,
        email: formData.email,
        contactNo: formData.phone,
        gst: formData.gstNumber,
        partyType: formData.partyType,
      };

      const created = await partyApi.createParty(createData);

      // Assign to a group if one was chosen (creating a new group first when needed).
      const groupId = await resolveGroupId(groupChoice, newGroupName);
      if (groupId != null && created.data?.id) {
        await partyGroupApi.assignParty(created.data.id, groupId);
      }

      toast.success('Party added successfully!');
      setFormData(EMPTY_FORM);
      setGroupChoice('');
      setNewGroupName('');

      await fetchParties();
    } catch (error) {
      console.error('Error adding party:', error);
      if (error?.message !== 'missing group name') {
        toast.error(error.response?.data?.message || 'Failed to add party');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(EMPTY_FORM);
  };

  const handleEdit = (party) => {
    setEditDialog({ isOpen: true, data: party });
  };

  const handleSaveEdit = async (edited) => {
    try {
      const updateData = {
        name: edited.name,
        email: edited.email,
        contactNo: edited.phone,
        gst: edited.gstin,
        partyType: edited.partyType,
      };

      await partyApi.updateParty(editDialog.data.id, updateData);

      // Apply group membership change (create new group if requested; null removes from group).
      const groupId = await resolveGroupId(edited.groupChoice, edited.newGroupName || '');
      await partyGroupApi.assignParty(editDialog.data.id, groupId);

      await fetchParties();
      setEditDialog({ isOpen: false, data: null });
      toast.success('Party updated successfully!');
    } catch (error) {
      console.error('Error updating party:', error);
      if (error?.message !== 'missing group name') {
        toast.error(error.response?.data?.message || 'Failed to update party');
      }
    }
  };

  const handleDeleteClick = (party) => {
    setDeleteDialog({
      isOpen: true,
      partyId: party.id,
      partyName: party.name,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await partyApi.deleteParty(deleteDialog.partyId);
      await fetchParties();

      setDeleteDialog({ isOpen: false, partyId: null, partyName: '' });
      toast.success('Party deleted successfully!');
    } catch (error) {
      console.error('Error deleting party:', error);
      toast.error(error.response?.data?.message || 'Failed to delete party');
    } finally {
      setDeleting(false);
    }
  };

  const filteredParties = useMemo(
    () =>
      parties.filter((party) => {
        const bySearch = matchesSearch(party, debouncedSearch, ['name', 'email', 'gstin']);
        const byType = !filters.type || party.type.toLowerCase() === filters.type.toLowerCase();
        const byGroup = !filters.group || String(party.groupId) === String(filters.group);
        return bySearch && byType && byGroup;
      }),
    [parties, debouncedSearch, filters.type, filters.group],
  );

  const groupOptions = useMemo(() => groups.map((g) => ({ value: String(g.id), label: g.name })), [groups]);
  const typeOptions = useMemo(() => PARTY_TYPES.map((t) => ({ value: t.value, label: t.label })), []);

  return (
    <SidebarLayout>
      <PageHeader
        title="Add new party"
        subtitle="Customers and vendors for purchase and sales operations"
        backTo="/masters/party"
        backLabel="Party master"
        actions={
          <Button variant="outline" size="sm" onClick={() => setGroupModalOpen(true)}>
            <Users className="size-4" />
            <span className="hidden sm:inline">Group logins</span>
          </Button>
        }
      />

      <PageBody className="space-y-6">
        <Card className="gap-0 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGrid columns={2}>
              <Field label="Name" htmlFor="party-name" required>
                <Input
                  id="party-name"
                  type="text"
                  name="partyName"
                  value={formData.partyName}
                  onChange={handleChange}
                  required
                  placeholder="Enter party name"
                />
              </Field>

              <Field label="GSTIN" htmlFor="party-gst">
                <Input
                  id="party-gst"
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="24AAAAA0000A1Z5"
                  className="font-mono"
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

              <GroupPicker
                groups={groups}
                value={groupChoice}
                onChange={setGroupChoice}
                newName={newGroupName}
                onNewNameChange={setNewGroupName}
              />
            </FieldGrid>

            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Clear
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Save party'}
              </Button>
            </div>
          </form>
        </Card>

        <Section title="Existing parties" description="Everything already in the master, so you can spot duplicates before adding.">
          <PartiesTable
            filteredParties={filteredParties}
            searchQuery={search}
            setSearchQuery={onSearchChange}
            typeFilter={filters.type}
            setTypeFilter={(v) => setFilter('type', v)}
            groupFilter={filters.group}
            setGroupFilter={(v) => setFilter('group', v)}
            groupOptions={groupOptions}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            handleEdit={handleEdit}
            handleDeleteClick={handleDeleteClick}
            loading={loading}
          />
        </Section>
      </PageBody>

      <EditPartyDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, data: null })}
        onSave={handleSaveEdit}
        initialData={editDialog.data}
        groups={groups}
      />

      <GroupLoginsModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onChanged={() => {
          fetchGroups();
          fetchParties();
        }}
      />

      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ isOpen: false, partyId: null, partyName: '' });
        }}
        title="Delete this party?"
        description={
          <>
            <ConfirmName>{deleteDialog.partyName}</ConfirmName> will be removed from the master. This cannot be
            undone.
          </>
        }
        confirmLabel="Delete"
        busyLabel="Deleting…"
        isPending={deleting}
        onConfirm={handleConfirmDelete}
      />
    </SidebarLayout>
  );
};

export default AddParty;
