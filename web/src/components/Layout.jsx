import React, { useEffect, useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LogoutIcon from '@mui/icons-material/Logout';
import WarningIcon from '@mui/icons-material/Warning';
import SettingsIcon from '@mui/icons-material/Settings';
import BusinessIcon from '@mui/icons-material/Business';
import { FormControl, MenuItem, Select } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import apiClient, { API_BASE_URL } from '../services/api';
import { useLanguage } from '../state/LanguageContext';

const drawerWidth = 260;

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    apiClient.get('/auth/me/')
      .then((response) => setProfile(response.data.data ?? response.data))
      .catch(() => setProfile(null));
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        const refreshed = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
        const currentRefresh = refreshed.data.refresh || refreshToken;
        await axios.post(`${API_BASE_URL}/auth/logout/`, { refresh: currentRefresh }, {
          headers: { Authorization: `Bearer ${refreshed.data.access}` },
        });
      }
    } catch {
      // Local sign-out still completes if the server-side token has expired.
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/');
    }
  };

  const organizationMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Members', icon: <PeopleIcon />, path: '/members' },
    { text: 'Payments', icon: <PaymentIcon />, path: '/payments' },
    { text: 'Unpaid', icon: <WarningIcon />, path: '/unpaid' },
    { text: 'Finance', icon: <AccountBalanceIcon />, path: '/financial' },
    { text: 'Expenses', icon: <ReceiptLongIcon />, path: '/expenses' },
    { text: 'Events', icon: <EventIcon />, path: '/events' },
    { text: 'Staff', icon: <GroupIcon />, path: '/staff' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  const platformMenuItems = [
    { text: 'Platform Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Organizations', icon: <BusinessIcon />, path: '/platform/organizations' },
    { text: 'Organization Payments', icon: <ReceiptLongIcon />, path: '/platform/payments' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  const menuItems = profile?.is_platform_admin ? platformMenuItems : organizationMenuItems;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Brand Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, fontWeight: 'bold' }}>
          N
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight="bold" color="primary.dark">
            Nadik
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>
            {t('Management Panel')}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.dark' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 96, 100, 0.08)',
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'white' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(item.text)}
                  primaryTypographyProps={{ 
                    fontWeight: isActive ? 600 : 500, 
                    fontSize: '0.95rem' 
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer Actions */}
      <Divider />
      <List sx={{ px: 2, pb: 2, pt: 2 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary={t('Sign Out')} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="600" component="div">
            {t(menuItems.find(i => i.path === location.pathname)?.text || 'Dashboard')}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <FormControl size="small" sx={{ minWidth: 118 }}>
            <Select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              inputProps={{ 'aria-label': t('Language') }}
              sx={{ '& .MuiSelect-select': { py: 0.75 } }}
            >
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="ar">العربية</MenuItem>
            </Select>
          </FormControl>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid', borderColor: 'divider' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, sm: 4 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh' }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
