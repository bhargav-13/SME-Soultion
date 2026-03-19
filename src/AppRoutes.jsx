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
import PackingInvoice from "./pages/PackingInvoice";
import AddPackingInvoice from "./pages/AddPackingInvoice";

const AppRoutes = () => {

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Admin />
           </ProtectedRoute>
        }
      />
      <Route
        path="/masters/party"
        element={
          <ProtectedRoute>
            <PartyMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/party/add"
        element={
          <ProtectedRoute>
            <AddParty />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/party/edit/:id"
        element={
          <ProtectedRoute>
            <AddParty />
          </ProtectedRoute> 
        }
      />
      <Route
        path="/add-party"
        element={
          <ProtectedRoute>
            <AddParty />
           </ProtectedRoute>
        }
      />
      <Route
        path="/masters/category"
        element={
          <ProtectedRoute>
            <CategoryMaster />
           </ProtectedRoute>
        }
      />
      <Route
        path="/order"
        element={
          <ProtectedRoute>
            <OrderManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/select"
        element={
          <ProtectedRoute>
            <OrderList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/add"
        element={
          <ProtectedRoute>
            <AddOrder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing-invoice"
        element={
          <ProtectedRoute>
            <PackingInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing-invoice/add"
        element={
          <ProtectedRoute>
            <AddPackingInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/packing-invoice/edit/:id"
        element={
          <ProtectedRoute>
            <AddPackingInvoice />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-inventory"
        element={
          <ProtectedRoute>
            <AddInventoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-work"
        element={
          <ProtectedRoute>
            <JobWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/job-work/move"
        element={
          <ProtectedRoute>
            <MoveToJobWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-management/select"
        element={
          <ProtectedRoute>
            <ClientSelect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-management"
        element={
          <ProtectedRoute>
            <ClientManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
           <ProtectedRoute>
            <InvoicesList />
            </ProtectedRoute>
            }
         
      />
      <Route
        path="/invoices/create"
        element={
           <ProtectedRoute>
            <CreateInvoice />
            </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;
