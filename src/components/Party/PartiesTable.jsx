import { useMemo } from 'react';
import { Mail, Phone, SquarePen, Trash2, Users } from 'lucide-react';
import { DataTable, SortableHeader } from '@/components/data-table';
import { ListToolbar } from '@/components/list-toolbar';
import { RowActions } from '@/components/row-actions';
import { EmptyState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FILTER_ALL } from '@/hooks/use-list-filters';

/** Party type → badge tone. A customer and a vendor should not be the same colour at a glance. */
const TYPE_TONE = { Customer: 'info', Vendor: 'brass', Both: 'accent' };

const PartiesTable = ({
  filteredParties,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  groupFilter,
  setGroupFilter,
  groupOptions = [],
  onClearFilters,
  hasActiveFilters,
  handleEdit,
  handleDeleteClick,
  loading,
}) => {
  const fields = useMemo(
    () => [
      {
        key: 'type',
        label: 'Type',
        allLabel: 'All types',
        options: [
          { value: 'Customer', label: 'Customer' },
          { value: 'Vendor', label: 'Vendor' },
          { value: 'Both', label: 'Both' },
        ],
      },
      {
        key: 'group',
        label: 'Group',
        allLabel: 'All groups',
        hidden: groupOptions.length === 0,
        options: groupOptions,
      },
    ],
    [groupOptions],
  );

  const values = useMemo(
    () => ({ type: typeFilter || FILTER_ALL, group: groupFilter || FILTER_ALL }),
    [typeFilter, groupFilter],
  );

  const onFilterChange = (key, value) => {
    const next = value === FILTER_ALL ? '' : value;
    if (key === 'type') setTypeFilter(next);
    if (key === 'group') setGroupFilter?.(next);
  };

  const columns = useMemo(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <SortableHeader column={column}>Party</SortableHeader>,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.original.name}</p>
            {row.original.email ? (
              <p className="truncate text-[11.5px] text-ink-3">{row.original.email}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: ({ column }) => <SortableHeader column={column}>Type</SortableHeader>,
        cell: ({ row }) =>
          row.original.type ? (
            <Badge variant={TYPE_TONE[row.original.type] ?? 'muted'}>{row.original.type}</Badge>
          ) : (
            <span className="text-ink-3">—</span>
          ),
        size: 110,
      },
      {
        id: 'gstin',
        accessorKey: 'gstin',
        header: ({ column }) => <SortableHeader column={column}>GSTIN</SortableHeader>,
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] text-ink-2">{row.original.gstin || '—'}</span>
        ),
      },
      {
        id: 'contact',
        accessorKey: 'contact',
        header: 'Contact',
        cell: ({ row }) => <span className="font-mono text-[12.5px] text-ink-2">{row.original.contact || '—'}</span>,
      },
      {
        id: 'groupName',
        accessorKey: 'groupName',
        header: ({ column }) => <SortableHeader column={column}>Group</SortableHeader>,
        cell: ({ row }) =>
          row.original.groupName ? (
            <Badge variant="muted" className="gap-1">
              <Users className="size-3" />
              {row.original.groupName}
            </Badge>
          ) : (
            <span className="text-ink-3">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: SquarePen, onSelect: () => handleEdit(row.original) },
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                separatorBefore: true,
                onSelect: () => handleDeleteClick(row.original),
              },
            ]}
          />
        ),
        size: 60,
      },
    ],
    [handleEdit, handleDeleteClick],
  );

  return (
    <>
      <ListToolbar
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: 'Search name, email or GSTIN…',
        }}
        fields={fields}
        values={values}
        onChange={onFilterChange}
        onClear={onClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <DataTable
        columns={columns}
        data={filteredParties}
        getRowId={(p) => String(p.id)}
        isPending={loading}
        errorText="Could not load the parties."
        onRowClick={handleEdit}
        renderMobileCard={(p) => (
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">{p.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {p.type && <Badge variant={TYPE_TONE[p.type] ?? 'muted'}>{p.type}</Badge>}
                  {p.groupName && (
                    <Badge variant="muted" className="gap-1">
                      <Users className="size-3" />
                      {p.groupName}
                    </Badge>
                  )}
                </div>
              </div>
              <RowActions
                actions={[
                  { label: 'Edit', icon: SquarePen, onSelect: () => handleEdit(p) },
                  {
                    label: 'Delete',
                    icon: Trash2,
                    destructive: true,
                    separatorBefore: true,
                    onSelect: () => handleDeleteClick(p),
                  },
                ]}
              />
            </div>
            <div className="space-y-1 border-t border-line-2 pt-2.5 text-[12px] text-ink-2">
              {p.gstin && (
                <p className="truncate">
                  <span className="text-ink-3">GSTIN </span>
                  <span className="font-mono">{p.gstin}</span>
                </p>
              )}
              {p.contact && (
                <p className="flex items-center gap-1.5 truncate">
                  <Phone className="size-3 shrink-0 text-ink-3" />
                  <span className="font-mono">{p.contact}</span>
                </p>
              )}
              {p.email && (
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="size-3 shrink-0 text-ink-3" />
                  {p.email}
                </p>
              )}
            </div>
          </div>
        )}
        empty={
          hasActiveFilters ? (
            <EmptyState
              icon={Users}
              title="No parties match"
              description="Nothing here matches that search or filter."
              action={
                onClearFilters && (
                  <Button variant="outline" size="sm" onClick={onClearFilters}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No parties yet"
              description="Customers and vendors both live here — orders, bills and job work all point at a party."
            />
          )
        }
      />
    </>
  );
};

export default PartiesTable;
