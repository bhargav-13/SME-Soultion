import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";

import Navbar from "./navbar";
import logo from "../assets/logo.png";

const SidebarLayout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isMastersActive = location.pathname.startsWith("/masters");
  const [mastersOpen, setMastersOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const mastersRef = useRef(null);
  const closeTimer = useRef(null);

  const openPopover = useCallback(() => {
    clearTimeout(closeTimer.current);
    if (mastersRef.current) {
      const rect = mastersRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
    setMastersOpen(true);
  }, []);

  const closePopover = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setMastersOpen(false);
    }, 150);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    return () => clearTimeout(closeTimer.current);
  }, []);

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
          <nav className="px-3 py-4 space-y-1">
            {links.map((link) => (
              <div key={link.to}>
                {link.submenu ? (
                  // Masters with right-side popover
                  <div
                    ref={mastersRef}
                    onMouseEnter={openPopover}
                    onMouseLeave={closePopover}
                  >
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        mastersOpen || isMastersActive
                          ? "bg-white text-black font-semibold border border-black ml-2"
                          : "text-black hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 text-black">{link.icon}</span>
                        <span className="text-sm font-medium">{link.label}</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-black transition-transform duration-200 ${mastersOpen ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                ) : (
                  // Regular links
                  <Link
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      location.pathname === link.to
                        ? "bg-white text-gray-900 font-semibold border border-black ml-2"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-3 text-gray-600">{link.icon}</span>
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Masters submenu popover - rendered outside sidebar to avoid overflow clipping */}
        <div
          className={`fixed z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 transition-opacity duration-150 ${
            mastersOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={closePopover}
        >
          {masterLinks.map((sublink) => (
            <Link
              key={sublink.to}
              to={sublink.to}
              onClick={() => {
                setMastersOpen(false);
                setIsOpen(false);
              }}
              className={`flex items-center px-4 py-2.5 transition-colors text-sm ${
                location.pathname === sublink.to
                  ? "bg-gray-50 text-gray-900 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {sublink.icon && (
                <span className="mr-2.5 text-gray-500">{sublink.icon}</span>
              )}
              <span>{sublink.label}</span>
            </Link>
          ))}
        </div>

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
