import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileDown, KeyRound, Search, ShoppingBag, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/SidebarLayout';
import { PageBody, PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { EmptyState, ListSkeleton } from '@/components/states';
import { ConfirmDialog, ConfirmName } from '@/components/confirm-dialog';
import { ViewDialog } from '@/components/form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { clientPortalAdminApi } from '@/services/apiService';

const PAGE_SIZE = 10;

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

const HEAD_CLASS = 'px-4 py-3 text-center text-[11.5px] font-semibold tracking-[0.03em] text-ink-3 uppercase whitespace-nowrap';
const CELL_CLASS = 'px-4 py-3 text-center text-[13px] text-ink-2';

const ClientPortalAdmin = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [resetDialog, setResetDialog] = useState({ isOpen: false, partyId: null, partyName: '' });
  const [resetting, setResetting] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState({ isOpen: false, username: '', password: '' });
  const [pendingCountsByParty, setPendingCountsByParty] = useState({});

  const fetchAccounts = async (pageNum = 0, search = '') => {
    try {
      setLoading(true);
      const response = await clientPortalAdminApi.getAllClientAccounts(pageNum, PAGE_SIZE, search || undefined);
      const result = response.data;
      setAccounts(result?.data || []);
      setTotalPages(result?.totalPages || 0);
      setTotalElements(result?.totalElements || 0);
    } catch (error) {
      console.error('Error fetching client accounts:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch client accounts');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAccounts(page, searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [page, searchQuery]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  const fetchPendingRequestCounts = async () => {
    try {
      const response = await clientPortalAdminApi.getAllOrderRequests(
        0,
        200,
        undefined,
        undefined,
        undefined,
        'PENDING_APPROVAL',
      );
      const counts = {};
      (response.data?.data || []).forEach((req) => {
        if (req.partyId != null) {
          counts[req.partyId] = (counts[req.partyId] || 0) + 1;
        }
      });
      setPendingCountsByParty(counts);
    } catch (error) {
      console.error('Error fetching pending order request counts:', error);
    }
  };

  useEffect(() => {
    fetchPendingRequestCounts();
  }, [page, searchQuery]);

  const handleExport = async (onlyPending = false) => {
    try {
      const response = await clientPortalAdminApi.exportClientCredentials(onlyPending, {
        responseType: 'blob',
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', onlyPending ? 'client-credentials-pending.xlsx' : 'client-credentials.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting credentials:', error);
      toast.error(error.response?.data?.message || 'Failed to export credentials');
    }
  };

  const handleDownloadCsv = (account) => {
    const csvContent = `username,password\n${account.username},${account.initialPassword || ''}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${account.username}-credentials.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleResetClick = (account) => {
    setResetDialog({ isOpen: true, partyId: account.partyId, partyName: account.partyName });
  };

  const handleConfirmReset = async () => {
    try {
      setResetting(true);
      const response = await clientPortalAdminApi.resetClientCredentials(resetDialog.partyId);
      const credentials = response.data;
      setResetDialog({ isOpen: false, partyId: null, partyName: '' });
      setCredentialsModal({
        isOpen: true,
        username: credentials?.username || '',
        password: credentials?.password || '',
      });
      await fetchAccounts(page, searchQuery);
      toast.success('Credentials reset successfully!');
    } catch (error) {
      console.error('Error resetting credentials:', error);
      toast.error(error.response?.data?.message || 'Failed to reset credentials');
    } finally {
      setResetting(false);
    }
  };

  const pendingCount = accounts.filter((a) => a.credentialsPending).length;

  return (
    <SidebarLayout>
      <PageHeader
        title="Client portal"
        subtitle="Manage party login credentials for the client portal."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => handleExport(true)}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Export pending</span>
              <span className="sm:hidden">Pending</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport(false)}>
              <Download className="size-4" />
              <span className="hidden sm:inline">Export all</span>
              <span className="sm:hidden">All</span>
            </Button>
          </>
        }
      />

      <PageBody className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Total client accounts" value={totalElements} icon={Users} tone="info" />
          <StatCard label="Pending credentials (this page)" value={pendingCount} icon={KeyRound} tone="warning" />
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by party name…"
            className="bg-surface pl-9"
          />
        </div>

        {/* Table */}
        {loading ? (
          <ListSkeleton rows={6} className="h-14" />
        ) : accounts.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No client accounts found" />
        ) : (
          <Card className="gap-0 overflow-hidden py-0">
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`${HEAD_CLASS} text-left`}>Party name</TableHead>
                    <TableHead className={HEAD_CLASS}>Type</TableHead>
                    <TableHead className={HEAD_CLASS}>Username</TableHead>
                    <TableHead className={HEAD_CLASS}>Email</TableHead>
                    <TableHead className={HEAD_CLASS}>Contact</TableHead>
                    <TableHead className={HEAD_CLASS}>Status</TableHead>
                    <TableHead className={HEAD_CLASS}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow
                      key={account.partyId}
                      onClick={() =>
                        navigate(
                          `/client-portal/orders?username=${encodeURIComponent(account.username)}&partyName=${encodeURIComponent(account.partyName || '')}`,
                        )
                      }
                      className="cursor-pointer border-line-2"
                      title="View order requests for this client"
                    >
                      <TableCell className="px-4 py-3 text-left text-[13px]">
                        <span className="inline-flex items-center gap-2 font-medium text-ink">
                          <ShoppingBag className="size-4 text-ink-3" />
                          {account.partyName}
                          {pendingCountsByParty[account.partyId] > 0 && (
                            <Badge variant="danger" title="Pending order requests">
                              {pendingCountsByParty[account.partyId]}
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className={`${CELL_CLASS} uppercase`}>
                        {mapPartyTypeToLabel(account.partyType)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center font-mono text-[13px] text-ink-2">
                        {account.username}
                      </TableCell>
                      <TableCell className={CELL_CLASS}>{account.email || '-'}</TableCell>
                      <TableCell className="px-4 py-3 text-center font-mono text-[13px] text-ink-2">
                        {account.contactNo || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {account.credentialsPending ? (
                          <Badge variant="warning">Pending</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {account.credentialsPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadCsv(account)}
                              title="Download credentials (CSV)"
                            >
                              <FileDown className="size-4" />
                              CSV
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetClick(account)}
                            title="Reset credentials"
                          >
                            <KeyRound className="size-4" />
                            Reset
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] text-ink-3">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </PageBody>

      {/* Reset confirmation */}
      <ConfirmDialog
        open={resetDialog.isOpen}
        onOpenChange={(open) => !open && setResetDialog({ isOpen: false, partyId: null, partyName: '' })}
        title="Reset credentials"
        description={
          <>
            This will generate a new password for <ConfirmName>{resetDialog.partyName}</ConfirmName>. The old
            password will stop working immediately. Continue?
          </>
        }
        confirmLabel="Reset"
        busyLabel="Resetting…"
        isPending={resetting}
        onConfirm={handleConfirmReset}
      />

      {/* New credentials */}
      <ViewDialog
        open={credentialsModal.isOpen}
        onOpenChange={(open) => !open && setCredentialsModal({ isOpen: false, username: '', password: '' })}
        title="New credentials"
        description="Share these credentials with the party. The password will not be shown again."
        size="sm"
        actions={
          <Button onClick={() => setCredentialsModal({ isOpen: false, username: '', password: '' })}>Done</Button>
        }
      >
        <div className="space-y-1.5 rounded-lg border border-line bg-surface-2 p-4">
          <p className="text-[13px] text-ink-2">
            <span className="font-medium text-ink">Username:</span>{' '}
            <span className="font-mono">{credentialsModal.username}</span>
          </p>
          <p className="text-[13px] text-ink-2">
            <span className="font-medium text-ink">Password:</span>{' '}
            <span className="font-mono">{credentialsModal.password}</span>
          </p>
        </div>
      </ViewDialog>
    </SidebarLayout>
  );
};

export default ClientPortalAdmin;
