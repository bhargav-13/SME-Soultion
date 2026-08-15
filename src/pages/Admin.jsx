import { Outlet } from 'react-router-dom';
import SidebarLayout from '@/components/SidebarLayout';
import DashboardCards from '@/components/DashboardCards';
import { PageBody, PageHeader } from '@/components/page-header';

const Admin = () => (
  <SidebarLayout>
    <PageHeader
      title="Operations dashboard"
      subtitle="Live view across items, orders and job work — click any card to drill in"
    />
    <PageBody className="space-y-5 sm:space-y-6">
      <DashboardCards />
      <Outlet />
    </PageBody>
  </SidebarLayout>
);

export default Admin;
