import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { ListToolbar } from '@/components/list-toolbar';
import { PageBody, PageHeader } from '@/components/page-header';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { matchesSearch, useListFilters } from '@/hooks/use-list-filters';
import { cn } from '@/lib/utils';
import { partyApi } from '@/services/apiService';

/**
 * Step one of placing an order: pick the party it is for.
 *
 * A radio list rather than a dropdown — the whole point of this screen is scanning a few hundred
 * party names, which a closed select makes harder, not easier.
 */
const OrderList = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState(null);

  const { search, onSearchChange, debouncedSearch, clearFilters, hasActiveFilters } = useListFilters();

  useEffect(() => {
    const fetchParties = async () => {
      try {
        setLoading(true);
        const response = await partyApi.getAllParties();
        const data = Array.isArray(response.data) ? response.data : [];
        setParties(data);
      } catch (error) {
        console.error('Error fetching parties:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch party list');
        setParties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchParties();
  }, []);

  const filteredParties = useMemo(
    () => parties.filter((party) => matchesSearch(party, debouncedSearch, ['name'])),
    [parties, debouncedSearch],
  );

  const handleContinue = () => {
    if (!selectedPartyId) {
      toast.error('Please select a party');
      return;
    }
    const selectedParty = parties.find((party) => party.id === selectedPartyId) || null;
    navigate('/order/add', { state: { selectedParty } });
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || null;

  return (
    <SidebarLayout>
      <PageHeader
        title="Select a party"
        subtitle="Choose who this order is for, then continue"
        backTo="/order"
        backLabel="Orders"
      />

      <PageBody>
        <ListToolbar
          search={{ value: search, onChange: onSearchChange, placeholder: 'Search parties…' }}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {loading ? (
          <ListSkeleton rows={6} />
        ) : filteredParties.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasActiveFilters ? 'No parties match' : 'No parties yet'}
            description={
              hasActiveFilters
                ? 'Nothing here matches that search.'
                : 'Add a party in the party master before placing an order.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/masters/party/add')}>
                  Add a party
                </Button>
              )
            }
          />
        ) : (
          <Card
            className="gap-0 p-3 sm:p-4"
            role="radiogroup"
            aria-label="Party"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredParties.map((party) => {
                const isActive = selectedPartyId === party.id;
                return (
                  <button
                    type="button"
                    key={party.id}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setSelectedPartyId(party.id)}
                    className={cn(
                      'flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-[13px] transition-colors',
                      isActive
                        ? 'border-primary bg-primary-soft font-medium text-primary'
                        : 'border-line text-ink-2 hover:border-ink-3 hover:bg-surface-2',
                    )}
                  >
                    <span className="truncate">{party.name}</span>
                    {isActive && (
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Sticky so the action stays reachable however long the party list runs. */}
        <div className="sticky bottom-0 z-10 mt-4 flex flex-col-reverse gap-2 border-t border-line bg-[color-mix(in_oklab,var(--paper)_88%,transparent)] py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-ink-3">
            {selectedParty ? (
              <>
                Selected <span className="font-medium text-ink">{selectedParty.name}</span>
              </>
            ) : (
              'Select a party to continue.'
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/order')} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleContinue} disabled={!selectedPartyId} className="flex-1 sm:flex-none">
              Continue
            </Button>
          </div>
        </div>
      </PageBody>
    </SidebarLayout>
  );
};

export default OrderList;
