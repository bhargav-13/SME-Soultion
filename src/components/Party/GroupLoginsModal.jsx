import { useEffect, useState } from 'react';
import { Building2, Copy, KeyRound, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { ViewDialog } from '@/components/form-dialog';
import { Notice } from '@/components/notice';
import { EmptyState, ListSkeleton } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { partyGroupApi } from '@/services/apiService';

/**
 * Manage the shared logins for party groups: view each group's login, reset its password, create a
 * new group, and see which companies belong to it. Membership itself is assigned per-party from the
 * Party form (the "Group" field), so this modal is credential/overview focused.
 */
const GroupLoginsModal = ({ isOpen, onClose, onChanged }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newName, setNewName] = useState('');
  const [credentials, setCredentials] = useState(null); // { username, password }
  const [toReset, setToReset] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await partyGroupApi.getAll();
      setGroups(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
      setCredentials(null);
      setNewName('');
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Enter a group name');
      return;
    }
    try {
      setCreating(true);
      const res = await partyGroupApi.create({ name: newName.trim() });
      toast.success('Group created');
      setNewName('');
      setCredentials({ username: res.data.username, password: res.data.initialPassword });
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async () => {
    if (!toReset) return;
    try {
      setResetting(true);
      const res = await partyGroupApi.resetCredentials(toReset.id);
      setCredentials({ username: res.data.username, password: res.data.password });
      setToReset(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset credentials');
    } finally {
      setResetting(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success('Copied');
  };

  return (
    <>
      <ViewDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Group logins"
        description="One shared login per group. Which companies belong to a group is set on each party."
        size="lg"
      >
        <div className="space-y-4">
          {/* A password is only ever shown once, at the moment it is generated. */}
          {credentials && (
            <Notice tone="success" title="New credentials — copy them now">
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5 text-[12.5px]">
                  <div>
                    <span className="text-ink-3">Username </span>
                    <span className="font-mono font-semibold text-ink">{credentials.username}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">Password </span>
                    <span className="font-mono font-semibold text-ink">{credentials.password}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(`${credentials.username} / ${credentials.password}`)}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            </Notice>
          )}

          {/* Create group */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="flex gap-2"
          >
            <Input
              type="text"
              placeholder="New group name (e.g. Mahaveer)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={creating}>
              <Plus className="size-4" />
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </form>

          {/* Groups list */}
          {loading ? (
            <ListSkeleton rows={3} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No groups yet"
              description="Create one above, then assign companies to it from each party."
            />
          ) : (
            <div className="space-y-2.5">
              {groups.map((group) => (
                <Card key={group.id} className="gap-0 rounded-lg p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-ink">{group.name}</span>
                        {group.credentialsPending && <Badge variant="warning">Password pending</Badge>}
                      </div>
                      <p className="mt-0.5 truncate font-mono text-[11.5px] text-ink-3">{group.username}</p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => setToReset(group)}>
                      <KeyRound className="size-3.5" />
                      Reset
                    </Button>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(group.parties || []).length === 0 ? (
                      <span className="text-[11.5px] text-ink-3">No companies assigned yet</span>
                    ) : (
                      group.parties.map((c) => (
                        <Badge key={c.partyId} variant="muted" className="gap-1">
                          <Building2 className="size-3" />
                          {c.partyName}
                        </Badge>
                      ))
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ViewDialog>

      <ConfirmDialog
        open={toReset !== null}
        onOpenChange={(open) => {
          if (!open) setToReset(null);
        }}
        title="Reset this group's login?"
        description={
          <>
            A new password is generated for <ConfirmName>{toReset?.name}</ConfirmName> and the old one stops working
            immediately. It is shown once — copy it before closing this dialog.
          </>
        }
        confirmLabel="Reset password"
        busyLabel="Resetting…"
        isPending={resetting}
        onConfirm={handleReset}
      />
    </>
  );
};

export default GroupLoginsModal;
