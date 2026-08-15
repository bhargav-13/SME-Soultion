import { Check } from 'lucide-react';
import { ViewDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * ClientListDialog
 *
 * Accepts `clients` as an array of party objects: { id, name, ... }
 * `selectedClient` and `onSelectClient` work with party objects.
 */
const ClientListDialog = ({
  isOpen,
  clients = [],
  loading = false,
  selectedClient,
  onSelectClient,
  onView,
  viewLabel = 'View',
  onClose,
}) => {
  return (
    <ViewDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Select a client"
      size="xl"
      actions={
        <>
          <Button variant="outline" onClick={onClose} className="px-10">
            Cancel
          </Button>
          <Button onClick={onView} disabled={!selectedClient} className="px-10">
            {viewLabel}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="grid max-h-[430px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-[13px] text-ink-3">No clients found.</div>
      ) : (
        <div className="grid max-h-[430px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
          {clients.map((client) => {
            const clientId = client.id ?? client;
            const clientName = client.name ?? client;
            const isActive = selectedClient != null && (selectedClient?.id ?? selectedClient) === clientId;

            return (
              <button
                key={clientId}
                type="button"
                onClick={() => onSelectClient(client)}
                className={cn(
                  'flex min-h-[44px] items-center justify-between rounded-md border px-3 py-1.5 text-left text-[13px] transition',
                  isActive
                    ? 'border-primary bg-primary-soft text-primary'
                    : 'border-line text-ink-2 hover:border-primary/40 hover:bg-surface-2',
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{clientName}</span>
                  {client.groupName ? (
                    <span className="truncate text-[11px] text-ink-3">Group: {client.groupName}</span>
                  ) : null}
                </span>
                {isActive ? (
                  <span className="ml-2 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </ViewDialog>
  );
};

export default ClientListDialog;
