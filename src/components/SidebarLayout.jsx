import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Package,
  Layers,
  ChevronRight,
  User,
  ListTodo,
} from "lucide-react"; // icons

import Navbar from "./navbar";
import logo from "../assets/logo.png";

const SidebarLayout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(false);
  const location = useLocation(); // for active tab
  const isActive = (path) => location.pathname === path;
  const isMastersActive = location.pathname.startsWith("/masters");

  // Masters submenu links
  const masterLinks = [
    {
      to: "/masters/party",
      icon: <User className="w-4 h-4" />,
      label: "Party Master",
    },
    {
      to: "/masters/category",
      icon: <LayoutDashboard className="w-4 h-4" />,
      label: "Category Master",
    },
    {
      to: "/masters/item",
      icon: <ListTodo className="w-4 h-4" />,
      label: "Item Master",
    },
  ];

  // Sidebar links
  const links = [
    {
      to: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      to: "/masters",
      label: "Masters",
      icon: <Users className="w-5 h-5" />,
      hasArrow: true,
      submenu: masterLinks,
    },
    {
      to: "/inventory",
      label: "Inventory",
      icon: <Package className="w-5 h-5" />,
    },
    {
      to: "/in-house-plating",
      label: "In House Plating",
      icon: <Layers className="w-5 h-5" />,
    },
    // { to: "/packing-list", label: "Packing List", icon: <ShoppingCart className="w-5 h-5" /> },
    // { to: "/plating-job", label: "Plating Job - Work", icon: <Zap className="w-5 h-5" /> },
    // { to: "/shreya", label: "Shreya (maal banavanu)", icon: <Settings className="w-5 h-5" /> },
    // { to: "/other-job", label: "Other Job Work", icon: <Layers className="w-5 h-5" /> },
    // { to: "/purchase", label: "Purchase", icon: <ShoppingBag className="w-5 h-5" /> },
    // { to: "/selling", label: "Selling", icon: <ShoppingCart className="w-5 h-5" /> },
    // { to: "/admin", label: "Admin", icon: <UserCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fixed on left */}
        <aside
          className={`${
            isOpen ? "block" : "hidden"
          } md:block w-72 bg-white border-r border-gray-200 text-gray-800 fixed md:relative h-full z-20 overflow-y-auto scrollbar-hide`}
        >
          {/* Close icon for mobile */}
          <div className="md:hidden flex justify-end p-4 border-b border-gray-200">
            <button onClick={() => setIsOpen(false)} className="text-gray-800">
              <X className="w-6 h-6 cursor-pointer" />
            </button>
          </div>

          {/* Logo Section */}
          <div className="px-5 py-3 border-b border-gray-200 hidden md:flex md:justify-center">
            <img src={logo} alt="ISHITA Logo" className="h-12 w-auto" />
          </div>

          {/* Sidebar Links */}
          <nav className="p-4 space-y-1">
            {links.map((link) => (
              <div key={link.to}>
                {link.submenu ? (
                  // Masters with submenu popover
                  <div className="relative">
                    <button
                      // onClick={() => setMastersOpen(!mastersOpen)}
                      onMouseEnter={() => setMastersOpen(true)}
                      onMouseLeave={() => setMastersOpen(false)}
                      className={`w-full flex items-center px-4 py-2 `}
                    >
                      <div
                        className={`flex items-center justify-between py-2  rounded-lg transition-all duration-300 ease-out ${
                          mastersOpen || location.pathname.includes("/masters")
                            ? "bg-white text-black font-semibold border-2 border-black px-3"
                            : "text-black hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="mr-3 text-black">
                            {link.icon}
                          </span>
                          <span className="text-sm font-medium">
                            {link.label}
                          </span>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 text-black transition-transform ms-4 ${mastersOpen ? "rotate-90" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Submenu popover */}
                    {mastersOpen && (
                      <div
                        className="fixed bg-white rounded-lg shadow-lg border  border-gray-200 z-50 w-48"
                        style={{
                          left: "15%",
                          top: "23%",
                        }}
                      >
                        {link.submenu.map((sublink) => (
                          <Link
                            key={sublink.to}
                            to={sublink.to}
                            // onClick={() => {
                            //   setIsOpen(false);
                            //   setMastersOpen(false);
                            // }}
                            onMouseEnter={() => setMastersOpen(true)}
                            onMouseLeave={() => setMastersOpen(false)}
                            className={`flex items-center px-4 py-3 transition-colors text-sm border-b border-b-black last:border-b-0 ${
                              location.pathname === sublink.to
                                ? "bg-white text-gray-900 font-semibold "
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {sublink.icon && (
                              <span className="mr-3 text-gray-600">
                                {sublink.icon}
                              </span>
                            )}
                            <span>{sublink.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Regular links
                  <Link
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between rounded-lg transition-all duration-300 ease-out ${
                      location.pathname === link.to
                        ? "bg-white text-gray-900 font-semibold  rounded-lg px-4  border-black"
                        : "text-gray-700  rounded-lg hover:px-4"
                    }`}
                  >
                    <div className={`flex items-center py-2 ${
                      location.pathname === link.to
                        ? "bg-white text-gray-900 font-semibold border-2 rounded-lg px-3  border-black"
                        : "text-gray-700 hover:border-2 rounded-lg border-black px-3"
                    }`}>
                      <span className="mr-3 text-gray-600">{link.icon}</span>
                      <span className="text-sm font-medium">{link.label}</span>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full overflow-y-auto scrollbar-hide">
          {/* Mobile menu toggle */}
          <div className="md:hidden flex justify-start items-center p-4 bg-white border-b border-gray-200">
            <button
              onClick={() => setIsOpen(true)}
              className="text-gray-800 focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <Navbar />
          <div className="p-6 bg-gray-50/60">{children}</div>
        </main>

        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SidebarLayout;
