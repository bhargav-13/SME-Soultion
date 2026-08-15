import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

/** The rail's last open/closed state, so it survives a reload the way the old layout's did. */
function storedOpenState() {
  if (typeof document === 'undefined') return true;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`));
  return match ? match[1] !== 'false' : true;
}

/**
 * The authenticated shell: the navigation rail, and the inset every page's header and body render
 * into.
 *
 * Pages supply their own {@link PageHeader} and {@link PageBody} rather than having padding
 * imposed here, so a screen that needs a full-bleed surface (a print preview, a catalogue grid)
 * can have one without fighting a wrapper.
 */
const SidebarLayout = ({ children }) => (
  <SidebarProvider defaultOpen={storedOpenState()}>
    <AppSidebar />
    <SidebarInset className="min-w-0">{children}</SidebarInset>
  </SidebarProvider>
);

export default SidebarLayout;
