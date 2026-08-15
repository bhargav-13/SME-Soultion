import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, UserCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import PartiesTable from '@/components/Party/PartiesTable';
import EditPartyDialog from '@/components/Party/EditPartyDialog';
import GroupLoginsModal from '@/components/Party/GroupLoginsModal';
import { NEW_GROUP } from '@/components/Party/GroupPicker';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { fmtNumber } from '@/lib/format';
import { partyApi, partyGroupApi } from '@/services/apiService';

const mapPartyTypeToLabel = (partyType) => {
  switch (partyType) {
    case 'CUSTOMER':
      return 'Customer';
    case 'VENDOR':
      return 'Vendor';
    case 'BOTH':
      return 'Both';
    default:
      return partyType || '';
  }
};

const mapPartyTypeToApi = (value) => {
  if (!value) return '';
  if (['CUSTOMER', 'VENDOR', 'BOTH'].includes(value)) return value;

  const normalized = value.toLowerCase();
  if (normalized === 'customer') return 'CUSTOMER';
  if (normalized === 'vendor') return 'VENDOR';
  if (normalized === 'both') return 'BOTH';
  return '';
};

const PartyMaster = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({
    customers: 0,
    vendors: 0,
    total: 0,
  });
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

  // Fetch parties data on component mount
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

      // Transform API data to match component expectations
      const transformedParties = partiesData.map((party) => ({
        id: party.id,
        name: party.name,
        email: party.email,
        phone: party.contactNo,
        contact: party.contactNo,
        gstin: party.gst,
        type: mapPartyTypeToLabel(party.partyType),
        partyType: party.partyType,
        groupId: party.groupId ?? '',
        groupName: party.groupName || '',
      }));

      setParties(transformedParties);

      // Calculate stats
      const customers = transformedParties.filter(
        (p) => p.partyType === 'CUSTOMER' || p.partyType === 'BOTH',
      ).length;
      const vendors = transformedParties.filter(
        (p) => p.partyType === 'VENDOR' || p.partyType === 'BOTH',
      ).length;
      setStats({
        customers,
        vendors,
        total: transformedParties.length,
      });
    } catch (error) {
      console.error('Error fetching parties:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch parties');
      setStats({
        customers: 0,
        vendors: 0,
        total: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter parties based on search, type and group
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

  const groupOptions = useMemo(
    () => groups.map((g) => ({ value: String(g.id), label: g.name })),
    [groups],
  );

  const handleEdit = (party) => {
    setEditDialog({ isOpen: true, data: party });
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

  const handleSaveEdit = async (formData) => {
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        contactNo: formData.phone,
        gst: formData.gstin,
        partyType: mapPartyTypeToApi(formData.partyType || formData.type),
      };

      await partyApi.updateParty(editDialog.data.id, updateData);

      // Apply group membership change (create new group if requested; null removes from group).
      const groupId = await resolveGroupId(formData.groupChoice, formData.newGroupName || '');
      await partyGroupApi.assignParty(editDialog.data.id, groupId);

      // Refresh the list
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

      // Refresh the list
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

  return (
    <SidebarLayout>
      <PageHeader
        title="Party master"
        subtitle="Customers and vendors, with GST, contact and group details"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setGroupModalOpen(true)}>
              <Users className="size-4" />
              <span className="hidden sm:inline">Group logins</span>
            </Button>
            <Button size="sm" onClick={() => navigate('/masters/party/add')}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add party</span>
            </Button>
          </>
        }
      />

      <PageBody>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Customers"
            value={fmtNumber(stats.customers)}
            hint="Including parties marked Both"
            icon={UserCheck}
            tone="info"
            isPending={loading}
          />
          <StatCard
            label="Vendors"
            value={fmtNumber(stats.vendors)}
            hint="Including parties marked Both"
            icon={Building2}
            tone="brass"
            isPending={loading}
          />
          <StatCard
            label="Total parties"
            value={fmtNumber(stats.total)}
            icon={Users}
            tone="primary"
            isPending={loading}
          />
        </div>

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
      </PageBody>

      {/* Edit Party Dialog */}
      <EditPartyDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ isOpen: false, data: null })}
        onSave={handleSaveEdit}
        initialData={editDialog.data}
        groups={groups}
      />

      {/* Group Logins management */}
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
            <ConfirmName>{deleteDialog.partyName}</ConfirmName> will be removed from the master. Orders, bills and
            job work already pointing at it are not deleted. This cannot be undone.
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

export default PartyMaster;
