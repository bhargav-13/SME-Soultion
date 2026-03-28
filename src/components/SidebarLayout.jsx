import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  X,
  LayoutDashboard,
  Users,
  Package,
  Layers,
  Package2,
  ChevronRight,
  User,
  ListTodo,
  FileText,
  BriefcaseBusiness,
} from "lucide-react"; // icons

import Navbar from "./navbar";
import logo from "../assets/logo.png";

const SIDEBAR_STATE_KEY = "sidebar:isOpen";

const SidebarLayout = ({ children }) => {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_STATE_KEY);
      if (raw == null) return true;
      return raw === "true";
    } catch {
      return true;
    }
  });
  const location = useLocation();
  const isMastersActive = location.pathname.startsWith("/masters") || location.pathname.startsWith("/inventory");
  const isBillsActive = location.pathname.startsWith("/bills");
  const [submenuOpenKey, setSubmenuOpenKey] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const submenuRefs = useRef({});
  const closeTimer = useRef(null);

  const openPopover = useCallback((menuKey) => {
    clearTimeout(closeTimer.current);
    const currentRef = submenuRefs.current[menuKey];
    if (currentRef) {
      const rect = currentRef.getBoundingClientRect();
      setPopoverPos({
        top: rect.top,
        left: rect.right + 15,
      });
    }
    setSubmenuOpenKey(menuKey);
  }, []);

  const closePopover = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setSubmenuOpenKey(null);
    }, 150);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    return () => clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, String(isOpen));
    } catch {
      // Ignore storage write failures
    }
  }, [isOpen]);

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
      to: "/inventory",
      icon: <Package className="w-4 h-4" />,
      label: "Stock Master",
    },
  ];

  const billLinks = [
    {
      to: "/bills/purchase",
      icon: <FileText className="w-4 h-4" />,
      label: "Purchase Bill",
    },
    {
      to: "/bills/sales",
      icon: <FileText className="w-4 h-4" />,
      label: "Sels Bill",
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
      key: "bills",
      to: "/bills",
      label: "Bills",
      icon: <FileText className="w-5 h-5" />,
      hasArrow: true,
      activePaths: ["/bills"],
      submenu: billLinks,
    },
    {
      to: "/packing-invoice",
      label: "Packing Invoice",
      icon: <Package className="w-5 h-5" />,
    },
    {
      key: "masters",
      to: "/masters",
      label: "Masters",
      icon: <Users className="w-5 h-5" />,
      hasArrow: true,
      submenu: masterLinks,
    },
    {
      to: "/job-work",
      label: "Job Work",
      icon: <BriefcaseBusiness className="w-5 h-5" />,
    },
    {
      to: "/gres",
      label: "Gres",
      icon: <Package2 className="w-5 h-5" />,
    },
    {
      to: "/order",
      label: "Order",
      icon: <ListTodo className="w-5 h-5" />,
    },
    {
      to: "/client-management/select",
      label: "Client Management",
      icon: <User className="w-5 h-5" />,
      activePaths: ["/client-management/select", "/client-management"],
    },
    {
      to: "/invoices",
      label: "Invoices",
      icon: <FileText className="w-5 h-5" />,
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
            isOpen
              ? "translate-x-0 md:w-72 border-r border-gray-200 pointer-events-auto"
              : "-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden pointer-events-none md:pointer-events-none"
          } w-72 bg-white text-gray-800 fixed md:relative h-full z-30 md:z-20 overflow-y-auto scrollbar-hide transition-all duration-300 ease-in-out`}
        >
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
            <img src={logo} alt="ISHITA Logo" className="h-10 w-auto" />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-700 hover:text-black transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 cursor-pointer" />
            </button>
          </div>

          {/* Sidebar Links */}
          <nav className="px-3 py-4 space-y-2 pe-20">
            {links.map((link) => (
              <div key={link.to}>
                {link.submenu ? (
                  // Menu with right-side popover
                  <div
                    ref={(el) => {
                      if (!link.key) return;
                      submenuRefs.current[link.key] = el;
                    }}
                    onMouseEnter={() => openPopover(link.key)}
                    onMouseLeave={closePopover}
                  >
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        submenuOpenKey === link.key ||
                        (link.key === "masters" ? isMastersActive : isBillsActive)
                          ? "bg-white text-black font-normal border border-black ml-2"
                          : "text-black hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 text-black">{link.icon}</span>
                        <span className="text-sm font-normal">{link.label}</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-black transition-transform duration-200 ${
                          submenuOpenKey === link.key ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                  </div>
                ) : (
                  // Regular links
                  (() => {
                    const isActive = link.activePaths
                      ? link.activePaths.some((path) =>
                          location.pathname.startsWith(path),
                        )
                      : location.pathname === link.to;

                    return (
                  <Link
                    to={link.to}
                    className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-white text-gray-900 font-semibold border border-black ml-2"
                        : "text-black hover:border-1 hover:border-black hover:ml-2"
                    }`}
                  >
                    <span className="mr-3 text-gray-500">{link.icon}</span>
                    <span className="text-sm font-medium">{link.label}</span>
                  </Link>
                    );
                  })()
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Masters submenu popover - rendered outside sidebar to avoid overflow clipping */}
        {(() => {
          const currentMenu = links.find((link) => link.key === submenuOpenKey);
          if (!currentMenu?.submenu) return null;
          return (
        <div
          className={`fixed z-50 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 transition-opacity duration-150  ${
            submenuOpenKey
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={closePopover}
        >
          {currentMenu.submenu.map((sublink) => (
            <Link
              key={sublink.to}
              to={sublink.to}
              onClick={() => {
                setSubmenuOpenKey(null);
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
          );
        })()}

        {/* Main content */}
        <main className="flex-1 w-full overflow-y-auto scrollbar-hide">
          <Navbar showSidebarMenu={!isOpen} onOpenSidebar={() => setIsOpen(true)} />
          <div className="p-6 bg-gray-50/60">{children}</div>
        </main>

        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0  md:hidden z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SidebarLayout;
