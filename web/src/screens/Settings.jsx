import React, { useState, useEffect } from 'react';
import {
  Typography, Paper, Box, Grid, TextField, Button, CircularProgress,
  Alert, Divider, Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

export default function Settings() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [organizationSaving, setOrganizationSaving] = useState(false);

  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' });
  const [organizationForm, setOrganizationForm] = useState({
    name: '', slug: '', description: '', email: '', phone_number: '', location: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await apiClient.get('/auth/me/');
        const profileData = response.data.data ?? response.data;
        setProfile(profileData);
        setProfileForm({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          email: profileData.email || '',
        });
        setOrganizationForm({
          name: profileData.organization?.name || '',
          slug: profileData.organization?.slug || '',
          description: profileData.organization?.description || '',
          email: profileData.organization?.email || '',
          phone_number: profileData.organization?.phone_number || '',
          location: profileData.organization?.location || '',
        });
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Failed to load profile details.'));
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.patch('/auth/me/', profileForm);
      const profileData = response.data.data ?? response.data;
      setProfile(profileData);
      setSuccess(t('Profile updated successfully.'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleOrganizationSave = async (event) => {
    event.preventDefault();
    setOrganizationSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiClient.patch('/auth/organization/', organizationForm);
      const organization = response.data.data ?? response.data;
      setProfile((current) => ({ ...current, organization: { ...current.organization, ...organization } }));
      setSuccess(t('Organization settings updated successfully.'));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Failed to update organization settings.'));
    } finally {
      setOrganizationSaving(false);
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
      setSuccess(t('Password changed successfully.'));
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
      <Typography variant="h4" fontWeight="bold" gutterBottom>{t('Settings')}</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>{t('Personal Profile')}</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">{t('Role')}</Typography>
              <Chip
                label={profile?.is_platform_admin ? t('Platform Administrator') : profile?.is_admin ? t('Organization admin') : t('Staff')}
                color={profile?.is_platform_admin || profile?.is_admin ? 'primary' : 'default'}
                size="small"
              />
            </Box>
            <Box component="form" onSubmit={handleProfileSave}>
              <TextField fullWidth size="small" label={t('First name')} sx={{ mb: 2 }} value={profileForm.first_name} onChange={(event) => setProfileForm({ ...profileForm, first_name: event.target.value })} />
              <TextField fullWidth size="small" label={t('Last name')} sx={{ mb: 2 }} value={profileForm.last_name} onChange={(event) => setProfileForm({ ...profileForm, last_name: event.target.value })} />
              <TextField fullWidth size="small" required type="email" label={t('Email')} sx={{ mb: 2 }} value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} />
              <Button type="submit" variant="outlined" disabled={profileSaving} startIcon={profileSaving ? <CircularProgress size={18} /> : null}>
                {t('Save profile')}
              </Button>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3, mt: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>{t('Change Password')}</Typography>
            <Divider sx={{ mb: 3 }} />
            <form onSubmit={handlePasswordChange}>
              <TextField fullWidth size="small" type="password" required label={t('Current Password')} sx={{ mb: 2 }} value={passwordData.old_password} onChange={e => setPasswordData({...passwordData, old_password: e.target.value})} />
              <TextField fullWidth size="small" type="password" required label={t('New Password')} sx={{ mb: 2 }} value={passwordData.new_password} onChange={e => setPasswordData({...passwordData, new_password: e.target.value})} />
              <TextField fullWidth size="small" type="password" required label={t('Confirm New Password')} sx={{ mb: 3 }} value={passwordData.confirm_password} onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})} />
              <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}>
                {t('Update Password')}
              </Button>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>{t('Subscription')}</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">{t('Status')}</Typography>
              <Chip 
                label={profile?.organization?.days_until_expiration < 0
                  ? t('Expired')
                  : t(profile?.organization?.subscription_status || 'Unknown')}
                color={profile?.organization?.is_active && profile?.organization?.days_until_expiration >= 0 ? 'success' : 'error'} 
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">{t('Days Remaining')}</Typography>
              <Typography variant="body1" fontWeight="bold" color="warning.main">
                {profile?.organization?.days_until_expiration < 0
                  ? `${Math.abs(profile.organization.days_until_expiration)} ${t('days overdue')}`
                  : `${profile?.organization?.days_until_expiration ?? profile?.organization?.days_remaining ?? 0} ${t('days')}`}
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>{t('Organization')}</Typography>
            <Divider sx={{ mb: 3 }} />
            {profile?.organization ? (
              <Box component="form" onSubmit={handleOrganizationSave}>
                <TextField fullWidth size="small" required label={t('Organization name')} sx={{ mb: 2 }} value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })} disabled={!profile.is_admin} />
                <TextField fullWidth size="small" required label={t('Slug')} sx={{ mb: 2 }} value={organizationForm.slug} onChange={(event) => setOrganizationForm({ ...organizationForm, slug: event.target.value })} disabled={!profile.is_admin} />
                <TextField fullWidth size="small" type="email" label={t('Organization email')} sx={{ mb: 2 }} value={organizationForm.email} onChange={(event) => setOrganizationForm({ ...organizationForm, email: event.target.value })} disabled={!profile.is_admin} />
                <TextField fullWidth size="small" label={t('Phone')} sx={{ mb: 2 }} value={organizationForm.phone_number} onChange={(event) => setOrganizationForm({ ...organizationForm, phone_number: event.target.value })} disabled={!profile.is_admin} />
                <TextField fullWidth size="small" label={t('Location')} sx={{ mb: 2 }} value={organizationForm.location} onChange={(event) => setOrganizationForm({ ...organizationForm, location: event.target.value })} disabled={!profile.is_admin} />
                <TextField fullWidth size="small" multiline minRows={2} label={t('Description')} sx={{ mb: 2 }} value={organizationForm.description} onChange={(event) => setOrganizationForm({ ...organizationForm, description: event.target.value })} disabled={!profile.is_admin} />
                <Button type="submit" variant="outlined" disabled={!profile.is_admin || organizationSaving} startIcon={organizationSaving ? <CircularProgress size={18} /> : null}>
                  {t('Save organization')}
                </Button>
                {!profile.is_admin && <Typography variant="caption" color="text.secondary" display="block" mt={1}>{t('Only organization admins can edit these settings.')}</Typography>}
              </Box>
            ) : (
              <Alert severity="warning">{t('This account is not linked to an organization.')}</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
