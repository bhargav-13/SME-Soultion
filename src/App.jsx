import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
