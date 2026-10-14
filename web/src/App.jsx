import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

import Login from './screens/Login';
import Register from './screens/Register';
import Dashboard from './screens/Dashboard';
import StaffList from './screens/StaffList';
import MemberList from './screens/MemberList';
import PaymentList from './screens/PaymentList';
import UnpaidList from './screens/UnpaidList';
import ArticleList from './screens/ArticleList';
import ExpenseList from './screens/ExpenseList';
import FinancialStatus from './screens/FinancialStatus';
import Settings from './screens/Settings';
import PlatformOrganizations from './screens/PlatformOrganizations';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    primary: {
      main: '#006064', // Deep Trustworthy Teal for Nadik
      light: '#428e92',
      dark: '#00363a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff6f00', // Amber/Orange Accent
      light: '#ffa040',
      dark: '#c43e00',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
    },
    error: {
      main: '#c62828',
    },
    warning: {
      main: '#f57f17',
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1c242c',
      secondary: '#5c6e81',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e0e5ea',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#f8fafc',
          color: '#475569',
          borderBottom: '2px solid #e2e8f0',
        },
        root: {
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
  },
});

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute><StaffList /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><MemberList /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentList /></ProtectedRoute>} />
          <Route path="/unpaid" element={<ProtectedRoute><UnpaidList /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><ArticleList /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute><FinancialStatus /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/platform/organizations" element={<ProtectedRoute><PlatformOrganizations /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
