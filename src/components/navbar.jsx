// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
import { LogOut, UserCircle } from "lucide-react";

export default function Navbar() {
  // const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = "Profile"; // Replace with actual user data

  return (
    <nav className="bg-gray-50/60 text-gray-800 px-6 py-4.5 shadow-md z-40 border-b border-gray-200">
      <div className="flex justify-between items-center">
        {/* Left side - Empty space */}
        <div></div>
        
        {/* Right side - Profile and Logout */}
        <div className="flex items-center gap-4">
          {/* User Profile */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer" onClick={() => navigate("/profile")}>
            <UserCircle className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{userName}</span>
          </div>

          {/* Logout Button */}
          <button
            // onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
