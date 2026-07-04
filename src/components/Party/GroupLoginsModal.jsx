import React, { useEffect, useState } from "react";
import { X, KeyRound, Building2, Copy, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { partyGroupApi } from "../../services/apiService";

/**
 * Manage the shared logins for party groups: view each group's login, reset its password, create a
 * new group, and see which companies belong to it. Membership itself is assigned per-party from the
 * Party form (the "Group" field), so this modal is credential/overview focused.
 */
const GroupLoginsModal = ({ isOpen, onClose, onChanged }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [credentials, setCredentials] = useState(null); // { username, password }

  const load = async () => {
    try {
      setLoading(true);
      const res = await partyGroupApi.getAll();
      setGroups(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      load();
      setCredentials(null);
      setNewName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Enter a group name");
      return;
    }
    try {
      setCreating(true);
      const res = await partyGroupApi.create({ name: newName.trim() });
      toast.success("Group created");
      setNewName("");
      setCredentials({ username: res.data.username, password: res.data.initialPassword });
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (group) => {
    if (!window.confirm(`Reset login for "${group.name}"?`)) return;
    try {
      const res = await partyGroupApi.resetCredentials(group.id);
      setCredentials({ username: res.data.username, password: res.data.password });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset credentials");
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Group Logins</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {credentials && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
              <div className="text-sm">
                <div>
                  <span className="text-gray-500">Username:</span>{" "}
                  <span className="font-medium">{credentials.username}</span>
                </div>
                <div>
                  <span className="text-gray-500">Password:</span>{" "}
                  <span className="font-mono font-medium">{credentials.password}</span>
                </div>
              </div>
              <button
                onClick={() => copy(`${credentials.username} / ${credentials.password}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
            </div>
          )}

          {/* Create group */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New group name (e.g. Mahaveer)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Create
            </button>
          </div>

          {/* Groups list */}
          {loading ? (
            <div className="text-center text-gray-500 py-6">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-6">
              No groups yet. Create one above, then assign companies to it from each party.
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{group.name}</span>
                        {group.credentialsPending && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
                            Password pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Login: {group.username}</div>
                    </div>
                    <button
                      onClick={() => handleReset(group)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(group.parties || []).length === 0 ? (
                      <span className="text-xs text-gray-400">No companies assigned yet</span>
                    ) : (
                      group.parties.map((c) => (
                        <span
                          key={c.partyId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                        >
                          <Building2 className="w-3 h-3" />
                          {c.partyName}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupLoginsModal;
