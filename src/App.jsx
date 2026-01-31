import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './AppRoutes'; // extract routes here

function App() {
  return (
    // <AuthProvider>
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <AppRoutes />
      </Router>
      </>
    // </AuthProvider>
  );
}

export default App;
