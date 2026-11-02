import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import Login from './screens/Login';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import PlatformDashboard from './screens/PlatformDashboard';
import StaffList from './screens/StaffList';
import MemberList from './screens/MemberList';
import PaymentList from './screens/PaymentList';
import UnpaidList from './screens/UnpaidList';
import ArticleList from './screens/ArticleList';
import ExpenseList from './screens/ExpenseList';
import FinancialStatus from './screens/FinancialStatus';
import Settings from './screens/Settings';
import PlatformOrganizations from './screens/PlatformOrganizations';
import PlatformPayments from './screens/PlatformPayments';
import Layout from './components/Layout';
import apiClient from './services/api';
import { LanguageProvider } from './state/LanguageContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#006064',
      light: '#428e92',
      dark: '#00363a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff6f00',
      light: '#ffa040',
      dark: '#c43e00',
      contrastText: '#ffffff',
    },
    success: { main: '#2e7d32', light: '#e8f5e9' },
    error: { main: '#c62828', light: '#ffebee' },
    warning: { main: '#f57f17', light: '#fff8e1' },
    info: { main: '#0288d1', light: '#e1f5fe' },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1c242c',
      secondary: '#5c6e81',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Noto Sans Arabic", sans-serif',
    h4: { fontWeight: 700, letterSpacing: 0, fontSize: 'clamp(1.4rem, 5vw, 2rem)' },
    h5: { fontWeight: 600, letterSpacing: 0, fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' },
    h6: { fontWeight: 600, letterSpacing: 0 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.78rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: 'none',
          minHeight: 42,
          '&:hover': { boxShadow: '0px 2px 8px rgba(0,96,100,0.15)' },
          '&:active': { transform: 'scale(0.97)' },
          transition: 'transform 0.1s ease, box-shadow 0.2s ease',
        },
        sizeLarge: { minHeight: 48, fontSize: '1rem' },
        sizeSmall: { minHeight: 34, fontSize: '0.8rem' },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:active': { transform: 'scale(0.9)' },
          transition: 'transform 0.1s ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 12px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          transition: 'box-shadow 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 6px rgba(0,0,0,0.05)',
          borderRadius: 12,
        },
        elevation1: { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#f8fafc',
          color: '#475569',
          borderBottom: '2px solid #e2e8f0',
          whiteSpace: 'nowrap',
        },
        root: {
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 16px',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&:active': { transform: 'scale(0.98)' },
          transition: 'transform 0.1s ease, background-color 0.15s ease',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: { borderRadius: '8px !important', textTransform: 'none', fontWeight: 500 },
      },
    },
  },
});

function DashboardRouter() {
  const [platformAdmin, setPlatformAdmin] = useState(null);

  useEffect(() => {
    apiClient.get('/auth/me/')
      .then((response) => setPlatformAdmin((response.data.data ?? response.data).is_platform_admin))
      .catch(() => setPlatformAdmin(false));
  }, []);

  if (platformAdmin === null) return null;
  return platformAdmin ? <PlatformDashboard /> : <Dashboard />;
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <Router>
          <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><StaffList /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><MemberList /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentList /></ProtectedRoute>} />
          <Route path="/unpaid" element={<ProtectedRoute><UnpaidList /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><ArticleList /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute><FinancialStatus /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/platform/organizations" element={<ProtectedRoute><PlatformOrganizations /></ProtectedRoute>} />
          <Route path="/platform/payments" element={<ProtectedRoute><PlatformPayments /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
