import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useAuth } from '@/context/AuthContext';
import { initials } from '@/lib/format';

/**
 * The account card in the sidebar footer: who you are, and the one thing you can do about it.
 *
 * Signing out is behind a confirmation because it is one click away from every screen and there is
 * unsaved form state on most of them.
 */
export function NavUser() {
  const { user, isClient } = useAuth();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { logout } = useAuth();

  const email = user?.email ?? 'Signed in';
  const name = email.split('@')[0] || email;

  const signOut = () => {
    logout();
    setConfirmOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary-soft text-[11.5px] font-semibold text-primary">
                    {initials(email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-[13px] font-semibold text-ink capitalize">{name}</span>
                  <span className="truncate text-[11.5px] text-ink-3">{email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-ink-3" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary-soft text-[11.5px] font-semibold text-primary">
                      {initials(email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-[13px] font-semibold capitalize">{name}</span>
                    <span className="truncate text-[11.5px] text-ink-3">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="opacity-100">
                {isClient ? (
                  <UserRound className="size-4 text-primary" />
                ) : (
                  <ShieldCheck className="size-4 text-primary" />
                )}
                <span className="text-[12.5px] text-ink-2">{isClient ? 'Client' : 'Administrator'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Sign out?"
        description="You will need to sign in again to get back into the console. Anything you have typed but not saved will be lost."
        confirmLabel="Sign out"
        onConfirm={signOut}
      />
    </>
  );
}
