import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NavUser } from '@/components/nav-user';
import { ADMIN_NAV_SECTIONS, CLIENT_NAV_SECTIONS, isNavItemActive } from '@/components/sidebar-nav';
import CompanySwitcher from '@/components/ClientPortal/CompanySwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { clientPortalAdminApi } from '@/services/apiService';
import logo from '@/assets/logo.png';

/**
 * The count of client orders sitting in PENDING_APPROVAL, polled for the sidebar badge.
 *
 * It refreshes on window focus as well as on a timer, because the common case is an admin who left
 * the tab open on another screen — a ten-second poll they never look at is not what tells them a
 * request came in, coming back to the tab is.
 */
function usePendingApprovals(enabled) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await clientPortalAdminApi.getAllOrderRequests(
          0,
          1,
          undefined,
          undefined,
          undefined,
          'PENDING_APPROVAL',
        );
        if (!cancelled) setCount(response.data?.totalElements || 0);
      } catch {
        // Ignore errors fetching the notification count.
      }
    };
    refresh();

    window.addEventListener('focus', refresh);
    const interval = setInterval(refresh, 10000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      clearInterval(interval);
    };
  }, [enabled]);

  return count;
}

/**
 * The console's navigation rail.
 *
 * `collapsible="icon"` is what makes it usable on a tablet: it collapses to a 3rem strip of icons
 * rather than disappearing, so the whole map stays visible while the table beside it gets the
 * width. On a phone the same markup renders inside a sheet. The active item is derived from the
 * URL every render — there is no "selected" state to fall out of step with the page you are on.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const { isClient } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const pendingApprovals = usePendingApprovals(!isClient);

  const sections = isClient ? CLIENT_NAV_SECTIONS : ADMIN_NAV_SECTIONS;
  const home = isClient ? '/shop' : '/';

  // Tapping a link on a phone should also dismiss the sheet it was tapped in.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const badgeFor = (item) => (item.badge === 'pendingApprovals' && pendingApprovals > 0 ? pendingApprovals : null);

  return (
    <Sidebar collapsible="icon">
      {/* The logo file is the full ISHITA INDUSTRIES lockup — it already carries the name, so the
          header shows it alone rather than repeating the name as text beside it. The collapse
          control lives here too, so the rail can always be toggled from the rail itself. */}
      <SidebarHeader className="p-0">
        <div className="flex h-16 shrink-0 items-center gap-1 border-b border-line px-2.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            to={home}
            onClick={closeOnMobile}
            aria-label="ISHITA Industries — go to the dashboard"
            title={isClient ? 'Client portal' : 'ERP console'}
            className="flex min-w-0 flex-1 items-center rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface-2 group-data-[collapsible=icon]:hidden"
          >
            <img src={logo} alt="ISHITA Industries" className="h-8 w-auto max-w-full object-contain" />
          </Link>
          <SidebarTrigger
            aria-label="Collapse navigation"
            className="size-8 shrink-0 rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {isClient && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupContent>
              <CompanySwitcher />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const badge = badgeFor(item);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isNavItemActive(item, pathname)}
                        tooltip={item.title}
                      >
                        <Link to={item.url} onClick={closeOnMobile}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {badge != null && (
                        <SidebarMenuBadge className="bg-danger text-[10.5px] font-semibold text-white">
                          {badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-line-2">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
