// src/components/Navbar.jsx
import React, { useState } from "react";
import { Bell, Search, User, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ConfirmationDialog from "./ConfirmationDialog";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-6 py-4 hidden md:block">
        <div className="flex items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.email || 'User'}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showLogoutDialog}
        title="Logout Confirmation"
        message="Are you sure you want to logout? You will need to login again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
        isDangerous={true}
      />
    </>
  );
};

export default Navbar;
