import { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  clientPortalCompaniesApi,
  getSelectedPartyId,
  setSelectedPartyId,
} from '@/services/apiService';

/**
 * Lets a client who belongs to a group choose which company/party they are shopping as. The choice
 * is stored in localStorage and sent as the X-Party-Id header on every client-portal request.
 * Renders nothing for a standalone client (a single company) — it just pins that company silently.
 */
const CompanySwitcher = () => {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(getSelectedPartyId() || '');

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
        setSelected(chosen != null ? String(chosen) : '');
      } catch {
        // Ignore — switcher just won't render.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () => companies.map((c) => ({ value: String(c.partyId), label: c.partyName })),
    [companies],
  );

  // Nothing to switch between for a standalone client.
  if (companies.length <= 1) return null;

  const handleChange = (value) => {
    setSelectedPartyId(value);
    setSelected(value);
    // Reload so every screen refetches scoped to the newly selected company.
    window.location.reload();
  };

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
        <Building2 className="size-3" aria-hidden="true" />
        Company
      </p>
      <SearchableSelect
        ariaLabel="Shopping as company"
        options={options}
        value={selected}
        onChange={handleChange}
        placeholder="Select company"
        searchPlaceholder="Search companies…"
        className="w-full"
      />
    </div>
  );
};

export default CompanySwitcher;
