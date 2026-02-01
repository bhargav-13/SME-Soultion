// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
// import { useAuth } from "../context/AuthContext";
import { LogOut, User } from "lucide-react";

export default function Navbar() {
  const navigate = useNavigate();
  const userName = "Profile";

  return (
    <nav className="sticky top-0 z-40 bg-gray-50/90 backdrop-blur border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex justify-between items-center">
        <div></div>

        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <User className="w-5 h-5 text-gray-600" />
            <span className=" font-medium text-gray-700">
              {userName}
            </span>
          </div>

          <button className="flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition font-medium">
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
