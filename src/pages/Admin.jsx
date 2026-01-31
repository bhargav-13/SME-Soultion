import React from 'react'
import { useState } from "react";
import {  Outlet } from "react-router-dom";

import SidebarLayout from '../components/SidebarLayout';
import DashboardCards from '../components/DashboardCards';
const Admin = () => {

   return (
    <SidebarLayout>
       <DashboardCards />
       
      <Outlet />
      
    </SidebarLayout>
  );
  
}

export default Admin
