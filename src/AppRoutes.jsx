import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Auth/Login";
import Admin from "./pages/Admin";
import AddParty from "./pages/Masters/Party/AddParty";
import PartyMaster from "./pages/Masters/Party/PartyMaster";
import CategoryMaster from "./pages/Masters/Category/CategoryMaster";
import Inventory from "./pages/Inventory";
import AddInventoryPage from "./pages/AddInventoryPage";
import InvoicesList from "./pages/Invoices/InvoicesList";
import CreateInvoice from "./pages/Invoices/CreateInvoice";
import OrderList from "./pages/Orders/OrderList";
import AddOrder from "./pages/Orders/AddOrder";
import OrderManagement from "./pages/Orders/OrderManagement";
import ClientSelect from "./pages/ClientManagement/ClientSelect";
import ClientManagement from "./pages/ClientManagement/ClientManagement";
import JobWork from "./pages/JobWork";
import MoveToJobWork from "./pages/MoveToJobWork";
import Gres from "./pages/Gres";
import MoveToGres from "./pages/MoveToGres";
import PackingInvoice from "./pages/PackingInvoice";
import AddPackingInvoice from "./pages/AddPackingInvoice";
import PurchaseManagement from "./pages/Bills/PurchaseManagement";
import AddPurchaseOrder from "./pages/Bills/AddPurchaseOrder";
import SalesManagement from "./pages/Bills/SalesManagement";
import AddSalesOrder from "./pages/Bills/AddSalesOrder";
import ClientPortalAdmin from "./pages/ClientPortal/ClientPortalAdmin";
import ClientOrderApprovals from "./pages/ClientPortal/ClientOrderApprovals";
import MyOrders from "./pages/ClientPortal/MyOrders";
import MyProfile from "./pages/ClientPortal/MyProfile";
import ProductCatalog from "./pages/ClientPortal/ProductCatalog";

const AppRoutes = () => {

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Admin />
           </ProtectedRoute>
        }
      />
      <Route
        path="/masters/party"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <PartyMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/party/add"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddParty />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/party/edit/:id"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddParty />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-party"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddParty />
           </ProtectedRoute>
        }
      />
      <Route
        path="/masters/category"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <CategoryMaster />
           </ProtectedRoute>
        }
      />
      <Route
        path="/order"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <OrderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/select"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <OrderList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/add"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing-invoice"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <PackingInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing-invoice/add"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddPackingInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing-invoice/edit/:id"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddPackingInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills/purchase"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <PurchaseManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills/purchase/add"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddPurchaseOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills/sales"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <SalesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills/sales/add"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddSalesOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-inventory"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AddInventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-work"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <JobWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-work/move"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <MoveToJobWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gres"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Gres />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gres/move"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <MoveToGres />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-management/select"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ClientSelect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-management"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ClientManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
           <ProtectedRoute allowedRoles={["ADMIN"]}>
            <InvoicesList />
            </ProtectedRoute>
            }

      />
      <Route
        path="/invoices/create"
        element={
           <ProtectedRoute allowedRoles={["ADMIN"]}>
            <CreateInvoice />
            </ProtectedRoute>
        }
      />

      {/* Client Portal - Admin */}
      <Route
        path="/client-portal"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ClientPortalAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-portal/orders"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ClientOrderApprovals />
          </ProtectedRoute>
        }
      />

      {/* Client Portal - Client-facing */}
      <Route
        path="/shop"
        element={
          <ProtectedRoute allowedRoles={["CLIENT"]}>
            <ProductCatalog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-orders"
        element={
          <ProtectedRoute allowedRoles={["CLIENT"]}>
            <MyOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-profile"
        element={
          <ProtectedRoute allowedRoles={["CLIENT"]}>
            <MyProfile />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;
