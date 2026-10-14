import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControlLabel, Checkbox, CircularProgress, Alert
} from '@mui/material';
import apiClient from '../services/api';

const DEFAULT_STAFF = {
  username: '', first_name: '', last_name: '', email: '', password: '',
  role: 'Staff', is_admin: false, salary: 0, phone_number: '',
  started: new Date().toISOString().split('T')[0]
};

export default function StaffDialog({ open, onClose, staff = null, onSuccess }) {
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
      setError(err.response?.data?.detail || 'An error occurred while saving the staff member.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Username" name="username" value={formData.username} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="email" required label="Email" name="email" value={formData.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="First Name" name="first_name" value={formData.first_name || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Last Name" name="last_name" value={formData.last_name || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="password" required={!staff} label={staff ? 'New Password (optional)' : 'Password'} name="password" value={formData.password} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" name="phone_number" value={formData.phone_number || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Role" name="role" value={formData.role || ''} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="number" label="Salary (MAD)" name="salary" value={formData.salary || 0} onChange={handleChange} inputProps={{ step: "0.01", min: "0" }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth type="date" required label="Start Date" name="started" value={formData.started || ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox name="is_admin" checked={formData.is_admin} onChange={handleChange} color="primary" />}
                label="Is Admin"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            {staff ? 'Save Changes' : 'Add Staff'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
