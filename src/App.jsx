import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <AuthProvider>
      {/* Toasts are the console's one transient surface, so they carry the design tokens rather
          than the library's defaults — a white box with grey-500 text would be the only thing on
          screen that isn't from the palette. */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          className: '',
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            boxShadow: 'var(--sh-pop)',
            fontSize: '13px',
            fontWeight: 500,
            padding: '10px 14px',
            maxWidth: '30rem',
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--danger)', secondary: '#fff' } },
          loading: { iconTheme: { primary: 'var(--primary-base)', secondary: '#fff' } },
        }}
      />
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
