import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Auth/Login";
import Admin from "./pages/Admin";
import AddParty from "./pages/Masters/Party/AddParty";
import PartyMaster from "./pages/Masters/Party/PartyMaster";
import CategoryMaster from "./pages/Masters/Category/CategoryMaster";
import ItemMaster from "./pages/Masters/Item/ItemMaster";
import AddItem from "./pages/Masters/Item/AddItem";

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
        path="/masters/item"
        element={
          <ProtectedRoute>
            <ItemMaster />
          </ProtectedRoute>
        }
      />
      <Route
        path="/masters/item/add"
        element={
          <ProtectedRoute>
            <AddItem />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
};

export default AppRoutes;
