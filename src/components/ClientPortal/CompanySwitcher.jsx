import React, { useEffect, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import {
  clientPortalCompaniesApi,
  getSelectedPartyId,
  setSelectedPartyId,
} from "../../services/apiService";

/**
 * Lets a client who belongs to a group choose which company/party they are shopping as. The choice
 * is stored in localStorage and sent as the X-Party-Id header on every client-portal request.
 * Renders nothing for a standalone client (a single company) — it just pins that company silently.
 */
const CompanySwitcher = () => {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(getSelectedPartyId() || "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await clientPortalCompaniesApi.getMyCompanies();
        const list = res.data || [];
        if (cancelled) return;
        setCompanies(list);

        // Make sure a valid company is always selected. If the stored one is gone (or none stored),
        // fall back to the first company.
        const stored = getSelectedPartyId();
        const valid = list.find((c) => String(c.partyId) === String(stored));
        const chosen = valid ? stored : list[0]?.partyId;
        if (chosen != null && String(chosen) !== String(stored)) {
          setSelectedPartyId(chosen);
        }
        setSelected(chosen != null ? String(chosen) : "");
      } catch {
        // Ignore — switcher just won't render.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to switch between for a standalone client.
  if (companies.length <= 1) return null;

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedPartyId(value);
    setSelected(value);
    // Reload so every screen refetches scoped to the newly selected company.
    window.location.reload();
  };

  return (
    <div className="mb-4 px-1">
      <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">
        Company
      </label>
      <div className="relative">
        <Building2 className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <select
          value={selected}
          onChange={handleChange}
          className="w-full appearance-none text-sm border border-gray-300 rounded-lg pl-8 pr-8 py-2 bg-white focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none truncate"
        >
          {companies.map((c) => (
            <option key={c.partyId} value={c.partyId}>
              {c.partyName}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
};

export default CompanySwitcher;
