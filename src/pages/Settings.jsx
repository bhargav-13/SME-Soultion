import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  ChevronRight,
  IndianRupee,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  ShieldCheck,
  Tags,
  UserRound,
  Users,
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';
import GroupLoginsModal from '@/components/Party/GroupLoginsModal';
import TranslationDialog from '@/components/JobWork/TranslationDialog';
import FixedBajaarDialog from '@/components/Settings/FixedBajaarDialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageBody, PageHeader, Section } from '@/components/page-header';
import { ReadOnlyField } from '@/components/form-field';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { initials } from '@/lib/format';

/**
 * The console's settings screen.
 *
 * It deliberately does not invent preferences the API cannot store. What it collects instead are
 * the things that *were* settings but had no home: the shared group logins (previously reachable
 * only from the party master's toolbar) and the print translation dictionary (previously buried
 * behind a button on the job-work list). Both are configuration, so this is where they belong.
 */
const SettingRow = ({ icon: Icon, title, description, onClick, to }) => {
  const body = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-[1.5] text-ink-3">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
    </>
  );

  const className =
    'group flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-3.5 text-left transition-all hover:border-primary/40 hover:shadow-sm';

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
};

const Settings = () => {
  const { user, isClient, logout } = useAuth();
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [translationsOpen, setTranslationsOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [fixedBajaarOpen, setFixedBajaarOpen] = useState(false);

  const email = user?.email ?? '—';

  return (
    <SidebarLayout>
      <PageHeader title="Settings" subtitle="Account, master data and print configuration" />

      <PageBody className="space-y-6">
        <Section title="Account" description="Who you are signed in as on this browser.">
          <Card className="gap-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar className="size-11 rounded-xl">
                <AvatarFallback className="rounded-xl bg-primary-soft text-[14px] font-semibold text-primary">
                  {initials(email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink capitalize">
                  {email.split('@')[0] || email}
                </p>
                <p className="truncate text-[12.5px] text-ink-3">{email}</p>
              </div>
              <Badge variant={isClient ? 'info' : 'accent'} className="gap-1">
                {isClient ? <UserRound className="size-3" /> : <ShieldCheck className="size-3" />}
                {isClient ? 'Client' : 'Administrator'}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <ReadOnlyField label="Email" value={email} />
              <ReadOnlyField label="Role" value={isClient ? 'CLIENT' : 'ADMIN'} mono />
              <ReadOnlyField label="Session" value="Signed in on this browser" />
            </div>

            <div className="mt-4 flex justify-end border-t border-line pt-4">
              <Button variant="outline" onClick={() => setSignOutOpen(true)}>
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </Card>
        </Section>

        {!isClient && (
          <>
            <Section title="Access" description="Logins that are shared rather than personal.">
              <SettingRow
                icon={KeyRound}
                title="Group logins"
                description="One shared login per party group, and the password reset for each."
                onClick={() => setGroupsOpen(true)}
              />
            </Section>

            <Section title="Job work" description="Rates that apply to every chitthi, not just one.">
              <SettingRow
                icon={IndianRupee}
                title="Fixed bajaar"
                description="The standing market rate shown on every job work set to “Fixed bajaar”."
                onClick={() => setFixedBajaarOpen(true)}
              />
            </Section>

            <Section title="Printing" description="What the job-work and gres chitthis print.">
              <SettingRow
                icon={Languages}
                title="Translations"
                description="Hindi and Gujarati wording for finishes and party names on every printed chitthi."
                onClick={() => setTranslationsOpen(true)}
              />
            </Section>

            <Section title="Master data" description="The lists everything else in the console points at.">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                <SettingRow
                  icon={Users}
                  title="Party master"
                  description="Customers and vendors, with GST and contact details."
                  to="/masters/party"
                />
                <SettingRow
                  icon={Tags}
                  title="Category master"
                  description="How the item master is grouped."
                  to="/masters/category"
                />
                <SettingRow
                  icon={Boxes}
                  title="Stock master"
                  description="Items, sizes and the stock held against them."
                  to="/inventory"
                />
              </div>
            </Section>
          </>
        )}

        {isClient && (
          <Section title="Your details" description="Company and contact details held against your account.">
            <SettingRow
              icon={Mail}
              title="My profile"
              description="The company you are shopping as, and how we reach you."
              to="/my-profile"
            />
          </Section>
        )}
      </PageBody>

      <GroupLoginsModal isOpen={groupsOpen} onClose={() => setGroupsOpen(false)} onChanged={() => {}} />
      <TranslationDialog isOpen={translationsOpen} onClose={() => setTranslationsOpen(false)} />
      <FixedBajaarDialog isOpen={fixedBajaarOpen} onClose={() => setFixedBajaarOpen(false)} />

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Sign out?"
        description="You will need to sign in again to get back into the console. Anything you have typed but not saved will be lost."
        confirmLabel="Sign out"
        onConfirm={() => {
          setSignOutOpen(false);
          logout();
        }}
      />
    </SidebarLayout>
  );
};

export default Settings;
