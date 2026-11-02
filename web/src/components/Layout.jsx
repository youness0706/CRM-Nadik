import React, { useEffect, useState } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton,
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Tooltip
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
import TranslateIcon from '@mui/icons-material/Translate';
import { FormControl, MenuItem, Select } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import apiClient, { API_BASE_URL } from '../services/api';
import { useLanguage } from '../state/LanguageContext';

const drawerWidth = 264;

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, direction, t } = useLanguage();

  useEffect(() => {
    apiClient.get('/auth/me/')
      .then((response) => setProfile(response.data.data ?? response.data))
      .catch(() => setProfile(null));
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
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
      // continue with local logout
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

  const orgName = profile?.organization?.name || 'Nadik';
  const orgInitial = orgName.charAt(0).toUpperCase();

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src={profile?.organization?.logo || undefined}
          alt={orgName}
          sx={{
            bgcolor: 'primary.main', width: 44, height: 44, fontWeight: 'bold',
            fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,96,100,0.25)',
          }}
        >
          {orgInitial}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary.dark" noWrap>
            {orgName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
            {t('Management Panel')}
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ mx: 2 }} />

      {/* Navigation */}
      <List sx={{ flexGrow: 1, px: 1.5, py: 1.5, gap: 0.5, display: 'flex', flexDirection: 'column' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2.5,
                  py: 1.1,
                  px: 1.5,
                  mb: 0.25,
                  '&.Mui-selected': {
                    background: 'linear-gradient(135deg, #006064 0%, #00838f 100%)',
                    color: 'white',
                    '&:hover': { background: 'linear-gradient(135deg, #00363a 0%, #006064 100%)' },
                    '& .MuiListItemIcon-root': { color: 'white' },
                  },
                  '&:hover:not(.Mui-selected)': {
                    backgroundColor: 'rgba(0, 96, 100, 0.07)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: isActive ? 'white' : 'primary.main', '& svg': { fontSize: '1.2rem' } }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(item.text)}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.9rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      <Divider sx={{ mx: 2 }} />
      <Box sx={{ p: 1.5 }}>
        <ListItemButton
          onClick={handleLogout}
          disabled={loggingOut}
          sx={{
            borderRadius: 2.5, color: 'error.main', py: 1.1, px: 1.5,
            '&:hover': { backgroundColor: 'error.light' },
            '& .MuiListItemIcon-root': { color: 'inherit' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}><LogoutIcon sx={{ fontSize: '1.2rem' }} /></ListItemIcon>
          <ListItemText primary={loggingOut ? '...' : t('Sign Out')} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'ltr' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          left: { xs: 0, sm: direction === 'rtl' ? 0 : `${drawerWidth}px` },
          right: { xs: 0, sm: direction === 'rtl' ? `${drawerWidth}px` : 0 },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          bgcolor: 'rgba(255,255,255,0.92)',
        }}
      >
        <Toolbar sx={{ direction, minHeight: { xs: 56, sm: 64 }, gap: 1 }}>
          <IconButton
            color="inherit"
            edge={direction === 'rtl' ? 'end' : 'start'}
            onClick={handleDrawerToggle}
            sx={{ display: { sm: 'none' }, borderRadius: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            fontWeight="700"
            component="div"
            dir={direction}
            sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: 'primary.dark' }}
          >
            {t(menuItems.find(i => i.path === location.pathname)?.text || 'Dashboard')}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {/* Language switcher */}
          <Tooltip title={t('Language')}>
            <FormControl size="small" sx={{ minWidth: 0, direction, flexShrink: 0 }}>
              <Select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                inputProps={{ 'aria-label': t('Language') }}
                startAdornment={<TranslateIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />}
                sx={{
                  '& .MuiSelect-select': { py: 0.6, pr: '28px !important', pl: 1, fontSize: '0.85rem' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                  borderRadius: 2,
                  bgcolor: 'background.default',
                }}
              >
                <MenuItem value="fr">FR</MenuItem>
                <MenuItem value="ar">ع</MenuItem>
              </Select>
            </FormControl>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ order: direction === 'rtl' ? 1 : 0, width: { xs: 0, sm: drawerWidth }, flexShrink: 0 }}>
        <Drawer
          variant="temporary"
          anchor={direction === 'rtl' ? 'right' : 'left'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, boxShadow: '4px 0 24px rgba(0,0,0,0.12)' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          anchor={direction === 'rtl' ? 'right' : 'left'}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: direction === 'rtl' ? 0 : '1px solid',
              borderLeft: direction === 'rtl' ? '1px solid' : 0,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        dir={direction}
        sx={{
          order: direction === 'rtl' ? 0 : 1,
          flexGrow: 1,
          minWidth: 0,
          maxWidth: '100%',
          p: { xs: 1.5, sm: 3 },
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        {children}
      </Box>
    </Box>
  );
}
