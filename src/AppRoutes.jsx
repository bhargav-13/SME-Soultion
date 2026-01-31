import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Admin from "./pages/Admin";
import AddParty from "./pages/Masters/Party/AddParty";
import PartyMaster from "./pages/Masters/Party/PartyMaster";
import CategoryMaster from "./pages/Masters/Category/CategoryMaster";
import ItemMaster from "./pages/Masters/Item/ItemMaster";
import AddItem from "./pages/Masters/Item/AddItem";

const AppRoutes = () => {

  return (
    <Routes>
      <Route
        path="/"
        element={ <Admin />}
      />
      <Route
        path="/masters/party"
        element={ <PartyMaster />}
      />
      <Route
        path="/masters/party/add"
        element={ <AddParty />}
      />
      <Route
        path="/masters/party/edit/:id"
        element={ <AddParty />}
      />
      <Route
        path="/add-party"
        element={ <AddParty />}
      />
      <Route
        path="/masters/category"
        element={ <CategoryMaster />}
      />
      <Route
        path="/masters/item"
        element={ <ItemMaster />}
      />
      <Route
        path="/masters/item/add"
        element={ <AddItem />}
      />

    </Routes>
  );
};

export default AppRoutes;
