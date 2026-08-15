import {
  Boxes,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileText,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListTodo,
  Package,
  Package2,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingBag,
  Tags,
  User,
  Users,
} from 'lucide-react';

/**
 * The console's navigation, grouped by the part of the business each screen belongs to rather than
 * as one flat list of fourteen links — an ERP sidebar without sections is a wall of text you read
 * top to bottom every time.
 *
 * The two roles get completely different maps, so they are defined separately instead of one list
 * filtered by a flag: a client never sees an admin item greyed out, it simply isn't there.
 *
 * `exact` highlights only on that URL rather than on every path beneath it. Needed where one
 * item's URL is a prefix of another's.
 */
export const ADMIN_NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Masters',
    items: [
      { title: 'Party master', url: '/masters/party', icon: Users },
      { title: 'Category master', url: '/masters/category', icon: Tags },
      { title: 'Stock master', url: '/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Sales & orders',
    items: [
      { title: 'Orders', url: '/order', icon: ListTodo },
      { title: 'Invoices', url: '/invoices', icon: ReceiptText },
      { title: 'Packing invoice', url: '/packing-invoice', icon: PackageCheck },
      { title: 'Purchase bills', url: '/bills/purchase', icon: FileText },
      { title: 'Sales bills', url: '/bills/sales', icon: FileText },
    ],
  },
  {
    label: 'Production',
    items: [
      { title: 'Job work', url: '/job-work', icon: BriefcaseBusiness },
      { title: 'Gres', url: '/gres', icon: Package2 },
      { title: 'In-house plating', url: '/in-house-plating', icon: Layers },
      { title: 'Outside job work', url: '/outside-job-work', icon: Building2 },
    ],
  },
  {
    label: 'Clients',
    items: [
      { title: 'Client management', url: '/client-management/select', icon: User, match: ['/client-management'] },
      { title: 'Client portal', url: '/client-portal', icon: KeyRound, badge: 'pendingApprovals' },
    ],
  },
  {
    label: 'System',
    items: [{ title: 'Settings', url: '/settings', icon: Settings }],
  },
];

export const CLIENT_NAV_SECTIONS = [
  {
    label: 'Shop',
    items: [
      { title: 'Products', url: '/shop', icon: ShoppingBag },
      { title: 'My orders', url: '/my-orders', icon: ClipboardList },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'My profile', url: '/my-profile', icon: User },
      { title: 'Settings', url: '/settings', icon: Settings },
    ],
  },
];

/** Flat list of every admin item, in section order — used to title a page from its URL. */
export const ADMIN_NAV_ITEMS = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

/** True when [pathname] is inside [item]'s section — the rule the sidebar highlights on. */
export function isNavItemActive(item, pathname) {
  const prefixes = item.match ?? [item.url];
  if (item.exact) return prefixes.some((p) => pathname === p || pathname === `${p}/`);
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Kept so a future screen can reuse the icon set without re-importing lucide. */
export const NAV_ICONS = { Package, Boxes };
