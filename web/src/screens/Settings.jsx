import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Box, Grid, TextField, Button, CircularProgress,
  Alert, Divider, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/auth/me/');
      setProfile(response.data.data ?? response.data);
    } catch (err) {
      setError('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/auth/password/change/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.confirm_password
      });
      setSuccess('Password changed successfully.');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to change password.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Settings</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Personal Profile</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body1" fontWeight="500">{profile?.first_name} {profile?.last_name}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Email</Typography>
              <Typography variant="body1" fontWeight="500">{profile?.email}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Role</Typography>
              <Chip
                label={profile?.is_platform_admin ? 'Platform Administrator' : profile?.is_admin ? 'Organization Admin' : 'Staff'}
                color={profile?.is_platform_admin || profile?.is_admin ? 'primary' : 'default'}
                size="small"
              />
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Change Password</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handlePasswordChange}>
              <TextField fullWidth size="small" type="password" required label="Current Password" sx={{ mb: 2 }} value={passwordData.old_password} onChange={e => setPasswordData({...passwordData, old_password: e.target.value})} />
              <TextField fullWidth size="small" type="password" required label="New Password" sx={{ mb: 2 }} value={passwordData.new_password} onChange={e => setPasswordData({...passwordData, new_password: e.target.value})} />
              <TextField fullWidth size="small" type="password" required label="Confirm New Password" sx={{ mb: 3 }} value={passwordData.confirm_password} onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})} />
              <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}>
                Update Password
              </Button>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Subscription</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip 
                label={profile?.organization?.subscription_status || 'Unknown'} 
                color={profile?.organization?.is_active ? 'success' : 'error'} 
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Days Remaining</Typography>
              <Typography variant="body1" fontWeight="bold" color="warning.main">
                {profile?.organization?.days_remaining || 0} days
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Organization</Typography>
            <Divider sx={{ mb: 3 }} />
            {profile?.organization ? (
              <Box>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography fontWeight="500" sx={{ mb: 2 }}>{profile.organization.name}</Typography>
                <Typography variant="body2" color="text.secondary">Slug</Typography>
                <Typography fontWeight="500">{profile.organization.slug}</Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  Organization profile editing is not available in the current API.
                </Alert>
              </Box>
            ) : (
              <Alert severity="warning">This account is not linked to an organization.</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
