import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControlLabel, Checkbox, CircularProgress, Alert
} from '@mui/material';
import apiClient from '../services/api';
import { getApiErrorMessage } from '../services/errors';
import { useLanguage } from '../state/LanguageContext';

const DEFAULT_STAFF = {
  username: '', first_name: '', last_name: '', email: '', password: '',
  role: 'Staff', is_admin: false, salary: 0, phone_number: '',
  started: new Date().toISOString().split('T')[0],
  datepay: new Date().toISOString().split('T')[0],
};

export default function StaffDialog({ open, onClose, staff = null, onSuccess }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(DEFAULT_STAFF);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setFormData(staff ? { ...staff, password: '' } : DEFAULT_STAFF);
      setError(null);
    }
  }, [open, staff]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Filter out password if empty on edit
    const payload = { ...formData };
    if (staff && !payload.password) {
      delete payload.password;
    }

    try {
      if (staff && staff.id) {
        await apiClient.put(`/crm/staff/${staff.id}/`, payload);
      } else {
        await apiClient.post('/crm/staff/', payload);
      }
      onSuccess();
    } catch (err) {
      setError(getApiErrorMessage(err, 'An error occurred while saving the staff member.'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{staff ? t('Edit Staff') : t('Add New Staff Member')}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label={t('Username')} name="username" value={formData.username} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="email" required label={t('Email')} name="email" value={formData.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('First Name')} name="first_name" value={formData.first_name || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('Last Name')} name="last_name" value={formData.last_name || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="password" required={!staff} label={staff ? t('New Password (optional)') : t('Password')} name="password" value={formData.password} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('Phone')} name="phone_number" value={formData.phone_number || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t('Role')} name="role" value={formData.role || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label={t('Salary (MAD)')} name="salary" value={formData.salary || 0} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label={t('Started')} name="started" value={formData.started || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" label={t('Last Salary Payment')} name="datepay" value={formData.datepay || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox name="is_admin" checked={formData.is_admin} onChange={handleChange} color="primary" />}
                label={t('Is Admin')}
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {staff ? t('Save Changes') : t('Add Staff')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
