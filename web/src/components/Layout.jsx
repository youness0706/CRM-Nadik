import React, { useState } from 'react';
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
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../services/api';

const drawerWidth = 260;

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    try {
      // Optional: Call backend logout if it exists
      await apiClient.post('/auth/logout/');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/');
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Members', icon: <PeopleIcon />, path: '/members' },
    { text: 'Payments', icon: <PaymentIcon />, path: '/payments' },
    { text: 'Finance', icon: <AccountBalanceIcon />, path: '/financial' },
    { text: 'Expenses', icon: <ReceiptLongIcon />, path: '/expenses' },
    { text: 'Events', icon: <EventIcon />, path: '/events' },
    { text: 'Staff', icon: <GroupIcon />, path: '/staff' },
  ];

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
            Management Panel
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
                  primary={item.text}
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
            <ListItemText primary="Sign Out" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }} />
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
            {menuItems.find(i => i.path === location.pathname)?.text || 'Dashboard'}
          </Typography>
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
